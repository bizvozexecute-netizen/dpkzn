// Измеряет SEO-покрытие: для каждого коммерческого кластера считает долю частотного
// объёма запросов, чьи значимые токены присутствуют на целевой странице
// (title+h1+subtitle+seo_description+seo_text+keywords+faq из data/detailing.db).
// Требует свежий `npm run db:reset`. Запуск: node scripts/coverage-report.mjs
import fs from "node:fs";
import Database from "better-sqlite3";

const db = new Database("data/detailing.db", { readonly: true });

// корпус текста по слагу услуги
const services = db.prepare("SELECT id, slug, title, h1, subtitle, seo_description, seo_text FROM services").all();
const kwRows = db.prepare("SELECT service_id, keyword FROM service_keywords").all();
const faqRows = db.prepare("SELECT service_id, question, answer FROM service_faq").all();
const kwById = new Map();
for (const k of kwRows) kwById.set(k.service_id, (kwById.get(k.service_id) || "") + " " + k.keyword);
const faqById = new Map();
for (const f of faqRows) faqById.set(f.service_id, (faqById.get(f.service_id) || "") + " " + f.question + " " + f.answer);

const corpusBySlug = new Map();
for (const s of services) {
  const text = [s.title, s.h1, s.subtitle, s.seo_description, s.seo_text, kwById.get(s.id) || "", faqById.get(s.id) || ""]
    .join(" ")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ") // выкинуть html-теги
    .replace(/ё/g, "е"); // нормализуем ё->е (юзеры пишут без ё)
  corpusBySlug.set(s.slug, text);
}

const STOP = new Set([
  "в", "на", "и", "с", "у", "к", "о", "по", "за", "до", "от", "для", "или", "из", "не", "что", "как",
  "авто", "автомобиль", "автомобиля", "автомобилю", "автомобилей", "машина", "машины", "машину", "машине",
  "казань", "казани", "казане", "это", "под", "так",
]);

function tokens(q) {
  return q
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^а-яёa-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP.has(w));
}
function covered(query, corpus) {
  const ts = tokens(query);
  if (ts.length === 0) return true;
  return ts.every((t) => corpus.includes(t.slice(0, 5)));
}

// запросы по кластерам из semantic-core.csv (только commercial)
const csv = fs.readFileSync("docs/seo/semantic-core.csv", "utf8").split("\n").slice(1).filter(Boolean);
function parseCsvLine(l) {
  const out = [];
  let cur = "", inq = false;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (ch === '"') { if (inq && l[i + 1] === '"') { cur += '"'; i++; } else inq = !inq; }
    else if (ch === "," && !inq) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const byCluster = new Map();
for (const line of csv) {
  const [query, shows, , , cluster, intent, url] = parseCsvLine(line);
  if (intent !== "commercial") continue;
  const slug = url.replace(/^\//, "");
  if (!byCluster.has(cluster)) byCluster.set(cluster, { slug, queries: [] });
  byCluster.get(cluster).queries.push({ query, shows: +shows || 0 });
}

const md = ["# SEO-покрытие по кластерам (Wordstat Казань)\n"];
md.push("Покрыт запрос, если все значимые токены (≥4 симв., без стоп-слов и гео) есть на целевой странице (мета+H1+keywords+FAQ+seoText). Взвешено по частотности (показы/мес).\n");
md.push("| Кластер | Страница | Покрытие (взвеш.) | Запросов покрыто | Объём покрыт |");
md.push("|---|---|--:|--:|--:|");

const rows = [...byCluster.entries()].sort((a, b) => {
  const sa = a[1].queries.reduce((s, q) => s + q.shows, 0);
  const sb = b[1].queries.reduce((s, q) => s + q.shows, 0);
  return sb - sa;
});

const gaps = [];
let globShows = 0, globCov = 0;
for (const [cluster, { slug, queries }] of rows) {
  const corpus = corpusBySlug.get(slug);
  let totShows = 0, covShows = 0, covN = 0;
  const uncovered = [];
  for (const q of queries) {
    totShows += q.shows;
    if (corpus && covered(q.query, corpus)) { covShows += q.shows; covN++; }
    else uncovered.push(q);
  }
  globShows += totShows; globCov += covShows;
  const pct = totShows ? Math.round((covShows / totShows) * 100) : 100;
  md.push(`| ${cluster} | /${slug}${corpus ? "" : " ⚠НЕТ СТРАНИЦЫ"} | ${pct}% | ${covN}/${queries.length} | ${covShows}/${totShows} |`);
  uncovered.sort((a, b) => b.shows - a.shows);
  if (uncovered.length) gaps.push({ cluster, slug, uncovered });
}

const globPct = globShows ? Math.round((globCov / globShows) * 100) : 0;
md.push(`\n**Итого по money-страницам: ${globPct}%** (${globCov}/${globShows} показов покрыто).\n`);

md.push("## Незакрытые запросы (топ по частотности, по кластерам)\n");
for (const g of gaps) {
  md.push(`### ${g.cluster} → /${g.slug}`);
  for (const u of g.uncovered.slice(0, 25)) md.push(`- ${u.query} — ${u.shows}`);
  md.push("");
}

fs.writeFileSync("docs/seo/coverage-report.md", md.join("\n"), "utf8");
console.log(`Итого покрытие money-страниц: ${globPct}% (${globCov}/${globShows})`);
console.log("Кластеры с наибольшими пробелами:");
for (const g of gaps.sort((a, b) => b.uncovered.reduce((s, x) => s + x.shows, 0) - a.uncovered.reduce((s, x) => s + x.shows, 0)).slice(0, 12)) {
  const lost = g.uncovered.reduce((s, x) => s + x.shows, 0);
  console.log(`  ${g.cluster} (/${g.slug}): не покрыто ${lost} показов, ${g.uncovered.length} запросов`);
}
