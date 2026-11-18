// Медиана нескольких прогонов Lighthouse (рекомендация Lighthouse: 5 прогонов,
// медианный по performance). Использование:
//   node scripts/lh-median.mjs <dir> <name>   — читает <dir>/<name>-run*.report.json,
//   печатает все прогоны и копирует медианный в <dir>/<name>.median.report.{json,html}
import { readFileSync, readdirSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const [dir, name] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.startsWith(`${name}-run`) && f.endsWith(".report.json")).sort();
const runs = files.map((f) => {
  const r = JSON.parse(readFileSync(join(dir, f), "utf8"));
  return {
    f,
    perf: Math.round(r.categories.performance.score * 100),
    lcp: r.audits["largest-contentful-paint"].numericValue,
    cls: r.audits["cumulative-layout-shift"].numericValue,
    tbt: r.audits["total-blocking-time"].numericValue,
    ff: r.configSettings.formFactor,
    thr: r.configSettings.throttlingMethod,
  };
});
for (const x of runs) console.log(`  ${x.f} ${x.ff}/${x.thr} perf=${x.perf} LCP=${(x.lcp / 1000).toFixed(2)}s CLS=${x.cls.toFixed(3)} TBT=${Math.round(x.tbt)}ms`);
const byPerf = [...runs].sort((a, b) => a.perf - b.perf);
const med = byPerf[Math.floor(byPerf.length / 2)];
const lcps = runs.map((x) => x.lcp).sort((a, b) => a - b);
const medLcp = lcps[Math.floor(lcps.length / 2)];
console.log(`${name}: runs=${runs.length} median-run=${med.f} perf=${med.perf} LCP=${(med.lcp / 1000).toFixed(2)}s | median LCP of runs=${(medLcp / 1000).toFixed(2)}s | ${medLcp <= 2500 && med.perf >= 90 ? "OK" : "FAIL"}`);
const base = med.f.replace(/\.report\.json$/, "");
copyFileSync(join(dir, med.f), join(dir, `${name}.median.report.json`));
if (existsSync(join(dir, `${base}.report.html`))) copyFileSync(join(dir, `${base}.report.html`), join(dir, `${name}.median.report.html`));
