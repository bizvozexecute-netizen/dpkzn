// Сравнение медиан Lighthouse: локальная сборка на тестовой БД против публичного production.
// Запуск: node docs/audit/tools/lh-compare.mjs <local.json> <prod.json> <rawProdDir> <out.md>
// Дополнительно проверяет по сырым JSON production, что заблокированные запросы (аналитика, /api/*) не ушли.
import fs from "node:fs";
import path from "node:path";
const [locF, prodF, rawDir, outF] = process.argv.slice(2);
const L = JSON.parse(fs.readFileSync(locF, "utf8"));
const P = JSON.parse(fs.readFileSync(prodF, "utf8"));
const TRACK = /mc\.yandex|metrika|top-fwz|vk\.com\/rtrg|googletagmanager|google-analytics|\/api\/(visits|submit|contact-click)/;
let files = 0, leaked = [], blockedSeen = 0;
for (const f of fs.readdirSync(rawDir).filter((x) => x.endsWith(".json"))) {
  files++;
  const j = JSON.parse(fs.readFileSync(path.join(rawDir, f), "utf8"));
  for (const r of j.audits["network-requests"]?.details?.items || []) {
    if (!TRACK.test(r.url)) continue;
    if (r.statusCode > 0) leaked.push(`${f}: ${r.statusCode} ${r.url.slice(0, 90)}`); else blockedSeen++;
  }
}
const d = (a, b, k) => (a == null || b == null ? "—" : (k === "CLS" ? (b - a).toFixed(3) : Math.round(b - a)));
const rows = P.results.map((p) => {
  const l = L.results.find((x) => x.name === p.name);
  const m = l?.median ?? {};
  const q = p.median;
  return `| ${p.name} | \`${p.url}\` | ${m.perf} → ${q.perf} | ${m.LCP_ms} → ${q.LCP_ms} (${d(m.LCP_ms, q.LCP_ms)}) | ${m.CLS} → ${q.CLS} | ${m.TBT_ms} → ${q.TBT_ms} | ${m.FCP_ms} → ${q.FCP_ms} | ${m.JS_kB} → ${q.JS_kB} | ${m.total_kB} → ${q.total_kB} | ${p.okRuns}/${P.runsPerTemplate} |`;
});
const md = `# Lighthouse: локальная сборка (тестовая БД) → публичный production

- Локально: ${L.runsPerTemplate} прогонов на серию, ${L.lighthouse}, дата ${L.date} (\`lighthouse-median.json\`).
- Production: ${P.base}, ${P.runsPerTemplate} прогона на серию, ${P.lighthouse}, дата ${P.date} (\`lighthouse-prod-median.json\`). Только загрузка страниц, формы не заполнялись и не отправлялись.
- Заблокировано в production-прогонах: ${P.blocked.map((b) => "`" + b + "`").join(", ")}.
- Проверка блокировки по сырым JSON (${files} файлов, вне git: \`${rawDir}\`): запросов к аналитике и /api/* со статусом > 0 — **${leaked.length}**, заблокированных (статус −1) — ${blockedSeen}.
- Ячейки — медианы «локально → production». В скобках у LCP — разница в мс (production минус локально).

| Серия | URL | Perf | LCP, мс | CLS | TBT, мс | FCP, мс | JS, кБ | Всего, кБ | Успешных (prod) |
|---|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}
${leaked.length ? "\nУтечки:\n" + leaked.map((x) => "- " + x).join("\n") + "\n" : ""}`;
fs.writeFileSync(outF, md);
console.log(md);
