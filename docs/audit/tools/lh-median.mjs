// Lighthouse: N прогонов на шаблон × (mobile, desktop), медиана по каждой метрике.
// Запуск (сервер уже поднят локально на тестовой БД, CRM/Telegram пустые):
//   BASE=http://127.0.0.1:3100 RUNS=5 RAW=.studio-tmp/lh5 node docs/audit/tools/lh-median.mjs docs/audit/evidence/lighthouse-median
// Пишет <out>.json (все прогоны + медианы) и <out>.md (таблица медиан и разброс).
// Прогоны идут последовательно, чтобы не мешать друг другу по CPU.
// Возобновляемый: готовые сырые JSON в RAW не перезапускаются; BUDGET_S ограничивает время одного вызова
// (сводка пишется только когда все прогоны есть).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE || "http://127.0.0.1:3100";
const RUNS = Number(process.env.RUNS || 5);
const RAW = path.resolve(process.env.RAW || ".studio-tmp/lh5");
// BLOCK — список шаблонов через запятую для --blocked-url-patterns (аналитика, /api/visits, /api/submit);
// LABEL — описание стенда в сводке (по умолчанию локальный next start на тестовой БД).
const BLOCK = (process.env.BLOCK || "").split(",").map((x) => x.trim()).filter(Boolean);
const LABEL = process.env.LABEL || "Локальный `next start` на тестовой БД";
const OUT = process.argv[2] || "docs/audit/evidence/lighthouse-median";
fs.mkdirSync(RAW, { recursive: true });

const TEMPLATES = [
  ["home", "/"],
  ["service", "/ppf"],
  ["alarms", "/ustanovka-signalizacii"],
  ["case", "/portfolio/bmw-420d-detailing"],
  ["article", "/blog/antidozhd-zachem-nuzhen"],
  ["portfolio", "/portfolio"],
  ["blog", "/blog"],
  ["contacts", "/contacts"],
];
const FACTORS = ["mobile", "desktop"];
const median = (a) => { const s = a.filter((v) => v != null).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const pick = (j) => {
  const a = j.audits;
  const js = (a["network-requests"]?.details?.items || []).filter((r) => r.resourceType === "Script").reduce((s, r) => s + (r.transferSize || 0), 0);
  return {
    perf: Math.round((j.categories.performance?.score ?? NaN) * 100),
    a11y: Math.round((j.categories.accessibility?.score ?? NaN) * 100),
    LCP_ms: Math.round(a["largest-contentful-paint"]?.numericValue ?? NaN),
    CLS: Number((a["cumulative-layout-shift"]?.numericValue ?? NaN).toFixed(3)),
    TBT_ms: Math.round(a["total-blocking-time"]?.numericValue ?? NaN),
    FCP_ms: Math.round(a["first-contentful-paint"]?.numericValue ?? NaN),
    JS_kB: Math.round(js / 1024),
    total_kB: Math.round((a["total-byte-weight"]?.numericValue ?? 0) / 1024),
    runtimeError: j.runtimeError?.code || null,
  };
};

const t0 = Date.now();
const BUDGET = Number(process.env.BUDGET_S || 1e9) * 1000;
let pending = 0;
const results = [];
for (const [name, p] of TEMPLATES) {
  for (const ff of FACTORS) {
    const runs = [];
    for (let i = 1; i <= RUNS; i++) {
      const file = path.join(RAW, `${name}-${ff}-${i}.json`);
      const args = [BASE + p, "--quiet", "--output=json", `--output-path=${file}`, "--only-categories=performance,accessibility", "--chrome-flags=--headless=new --no-sandbox --disable-gpu"];
      if (ff === "desktop") args.push("--preset=desktop");
      for (const b of BLOCK) args.push(`--blocked-url-patterns=${b}`);
      if (!fs.existsSync(file)) {
        if (Date.now() - t0 > BUDGET) { pending++; continue; }
        try {
          execFileSync("lighthouse", args, { stdio: ["ignore", "ignore", "pipe"], timeout: 180000 });
        } catch (e) {
          fs.writeFileSync(file + ".err", String(e.message).slice(0, 2000));
        }
      }
      if (fs.existsSync(file)) runs.push(pick(JSON.parse(fs.readFileSync(file, "utf8"))));
      else runs.push({ runtimeError: "CLI_FAILED (см. " + path.basename(file) + ".err)" });
      const r = runs.at(-1);
      process.stdout.write(`${name}-${ff} #${i}: perf=${r.perf} LCP=${r.LCP_ms} CLS=${r.CLS} TBT=${r.TBT_ms} JS=${r.JS_kB} err=${r.runtimeError}\n`);
    }
    const keys = ["perf", "a11y", "LCP_ms", "CLS", "TBT_ms", "FCP_ms", "JS_kB", "total_kB"];
    const med = Object.fromEntries(keys.map((k) => [k, median(runs.map((r) => r[k]))]));
    const range = Object.fromEntries(keys.map((k) => { const v = runs.map((r) => r[k]).filter((x) => x != null && !Number.isNaN(x)); return [k, v.length ? [Math.min(...v), Math.max(...v)] : null]; }));
    results.push({ name: `${name}-${ff}`, url: p, formFactor: ff, runs, okRuns: runs.filter((r) => !r.runtimeError).length, median: med, range });
  }
}

if (pending) { console.log("pending", pending, "runs; rerun to continue"); process.exit(3); }
fs.writeFileSync(OUT + ".json", JSON.stringify({ base: BASE, label: LABEL, blocked: BLOCK, runsPerTemplate: RUNS, lighthouse: execFileSync("lighthouse", ["--version"]).toString().trim(), date: new Date().toISOString(), results }, null, 2));
const rows = results.map((r) => `| ${r.name} | \`${r.url}\` | ${r.okRuns}/${RUNS} | ${r.median.perf} (${r.range.perf?.join("–")}) | ${r.median.a11y} | ${r.median.LCP_ms} (${r.range.LCP_ms?.join("–")}) | ${r.median.CLS} (${r.range.CLS?.join("–")}) | ${r.median.TBT_ms} (${r.range.TBT_ms?.join("–")}) | ${r.median.FCP_ms} | ${r.median.JS_kB} | ${r.median.total_kB} |`);
fs.writeFileSync(OUT + ".md", `# Lighthouse: медиана из ${RUNS} прогонов на шаблон\n\n${LABEL} (${BASE}), Lighthouse ${execFileSync("lighthouse", ["--version"]).toString().trim()}, прогоны последовательные.${BLOCK.length ? " Заблокировано: " + BLOCK.map((b) => "\`" + b + "\`").join(", ") + "." : ""} В скобках — разброс min–max. Сырые JSON — вне git (\`${path.relative(process.cwd(), RAW)}\`), все значения каждого прогона — в \`${path.basename(OUT)}.json\`.\n\n| Шаблон | URL | Успешных | Perf | A11y | LCP, мс | CLS | TBT, мс | FCP, мс | JS, кБ | Всего, кБ |\n|---|---|---|---|---|---|---|---|---|---|---|\n${rows.join("\n")}\n`);
console.log("done", results.length, "series");
