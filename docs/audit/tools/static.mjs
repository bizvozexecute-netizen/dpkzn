// Статические проверки по HTML (JSON-LD, h1, canonical, robots, alt) + API-проверка /api/submit.
// Запуск: сервер на 127.0.0.1:3100 с LEADS_DATA_DIR=/tmp/auditleads и пустыми CRM_WEBHOOK_URL/TG_BOT_TOKEN.
// node docs/audit/tools/static.mjs /tmp/pages.json
import fs from "node:fs";
const B = "http://127.0.0.1:3100";
const pages = JSON.parse(fs.readFileSync(process.argv[2] || "/tmp/pages.json", "utf8")).map((p) => p.path).filter((p) => !p.includes("/null"));
const out = [];
for (const p of pages) {
  const r = await fetch(B + p, { redirect: "manual" });
  const h = await r.text();
  const ld = [...h.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => {
    try { const j = JSON.parse(m[1]); return (j["@graph"] || [j]).map((x) => x["@type"]).flat().join("+"); } catch { return "INVALID"; }
  });
  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  const canon = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || "-";
  const desc = /<meta name="description" content="[^"]{20,}/.test(h);
  const robots = (h.match(/<meta name="robots" content="([^"]+)"/) || [])[1] || "-";
  const imgNoAlt = (h.match(/<img\b(?![^>]*\balt=)[^>]*>/g) || []).length;
  out.push([p, r.status, "ld=" + ld.join("|"), "h1=" + h1, "desc=" + desc, "robots=" + robots, "canon=" + canon.replace("https://dpkzn.ru", ""), "noalt=" + imgNoAlt, Math.round(h.length / 1024) + "kB"].join("  "));
}
console.log(out.join("\n"));
const body = { phone: "+79000000000", source: "audit-api-test", service: "audit", page: "/audit" };
const post = (b) => fetch(B + "/api/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
const r1 = await post(body); console.log("submit valid:", r1.status, await r1.text());
const r2 = await post({ phone: "123", source: "x" }); console.log("submit invalid:", r2.status, (await r2.text()).slice(0, 200));
const r3 = await post({ ...body, elapsedMs: 100 }); console.log("submit trap:", r3.status, await r3.text());
