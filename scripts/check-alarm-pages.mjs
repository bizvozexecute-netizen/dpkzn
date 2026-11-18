// Проверка отдаваемого HTML посадочных сигнализаций и записи заявки.
// Сервер запускается отдельно с LEADS_DATA_DIR=<временный каталог> и без
// CRM_WEBHOOK_URL/Telegram — заявка пишется только во временную БД.
// Запуск: node scripts/check-alarm-pages.mjs <baseUrl> <leadsDir>
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";

const [base, leadsDir] = process.argv.slice(2);
const pages = ["/ustanovka-signalizacii", "/ustanovka-signalizacii/avtozapusk", "/ustanovka-signalizacii/vybor-signalizacii", "/ustanovka-signalizacii/starline", "/ustanovka-signalizacii/pandora"];
let failed = 0;
const bad = (m) => { failed++; console.log("  FAIL", m); };

function checkLd(o, url, ids) {
  const t = o["@type"];
  if (o["@context"] !== "https://schema.org") bad(`${t}: @context`);
  if (t === "Service") {
    if (!o.name) bad("Service.name");
    // provider — либо объект с name, либо @id узла организации на этой же странице
    if (!o.provider?.name && !ids.has(o.provider?.["@id"])) bad("Service.provider unresolved");
    if (!o.areaServed) bad("Service.areaServed");
  } else if (t === "FAQPage") {
    if (!Array.isArray(o.mainEntity) || !o.mainEntity.length) bad("FAQPage.mainEntity");
    for (const q of o.mainEntity ?? []) if (q["@type"] !== "Question" || !q.name || q.acceptedAnswer?.["@type"] !== "Answer" || !q.acceptedAnswer.text) bad("FAQPage question shape");
  } else if (t === "BreadcrumbList") {
    const items = o.itemListElement ?? [];
    if (items.length < 2) bad("Breadcrumb length");
    items.forEach((it, i) => {
      if (it["@type"] !== "ListItem" || it.position !== i + 1 || !it.name) bad(`Breadcrumb item ${i}`);
      if (i < items.length - 1 && !/^https:\/\//.test(it.item ?? "")) bad(`Breadcrumb item ${i} url`);
    });
    console.log(`  breadcrumbs=${JSON.stringify(items.map((i) => [i.position, i.name, i.item ?? null]))}`);
  }
}

for (const p of pages) {
  const res = await fetch(base + p);
  const html = await res.text();
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, "");
  const forms = (html.match(/<form[\s>]/g) ?? []).length;
  const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const flat = lds.flatMap((o) => (o["@graph"] ? o["@graph"].map((g) => ({ "@context": o["@context"], ...g })) : [o]));
  const types = flat.map((o) => o["@type"]);
  console.log(`${p} status=${res.status} canonical=${canonical} forms=${forms} titleLen=${title.length}`);
  console.log(`  title=${title}`);
  console.log(`  description=${desc}`);
  console.log(`  h1=${h1}`);
  console.log(`  jsonld=${JSON.stringify(types)}`);
  if (res.status !== 200) bad("status");
  if (canonical !== `https://dpkzn.ru${p}` && canonical !== `https://dpkzn.ru${p}/`) bad(`canonical ${canonical}`);
  for (const need of ["Service", "FAQPage", "BreadcrumbList"]) if (!types.includes(need)) bad(`no ${need}`);
  const ids = new Set(flat.map((o) => o["@id"]).filter(Boolean));
  for (const o of flat) checkLd(o, p, ids);
  if (p !== pages[0]) {
    if (forms !== 1) bad(`forms=${forms}`);
    if (!html.includes(`alarm:${p.split("/").pop()}`)) bad("source not in page payload");
    if (title.length > 60 || !title.includes("Казан") || !title.endsWith("| Detailing Place")) bad("title rule");
  }
}

const sm = await (await fetch(base + "/sitemap.xml")).text();
for (const p of pages) if (!sm.includes(`<loc>https://dpkzn.ru${p}</loc>`) && !sm.includes(`<loc>https://dpkzn.ru${p}/</loc>`)) bad(`sitemap ${p}`);
console.log("sitemap: checked", pages.length, "urls");

// Заявка: тот же набор полей, что шлёт LeadForm (use-lead-submit), без ловушек
const body = {
  channel: "Звонок", phone: "+7 (900) 000-00-00", source: "alarm:avtozapusk", name: "Тест проверки",
  carBrand: "Kia Rio", service: "Сигнализация с автозапуском в Казани", page: "/ustanovka-signalizacii/avtozapusk",
  utm: { utm_source: "yandex", utm_medium: "cpc", utm_campaign: "alarms_2026_avtozapusk" },
};
const r = await fetch(base + "/api/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
console.log("submit", r.status, await r.text());
const db = new Database(path.join(leadsDir, "leads.db"), { readonly: true });
const row = db.prepare("select id, source, utm_source, utm_medium, utm_campaign, origin from leads order by id desc limit 1").get();
console.log("leads.db row", JSON.stringify(row));
if (row?.source !== "alarm:avtozapusk" || row?.utm_campaign !== "alarms_2026_avtozapusk") bad("lead row");
const journal = fs.readFileSync(path.join(leadsDir, "leads.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
console.log("leads.jsonl lines", journal.length, "last source", journal.at(-1).lead.source);
console.log(failed ? `RESULT FAIL ${failed}` : "RESULT OK");
process.exit(failed ? 1 : 0);
