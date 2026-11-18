// Разбор LCP в отчёте Lighthouse: элемент, фазы LCP и начало сетевого водопада.
//   node scripts/lh-lcp-detail.mjs <report.json> [...]
import { readFileSync } from "node:fs";

for (const file of process.argv.slice(2)) {
  const r = JSON.parse(readFileSync(file, "utf8"));
  const a = r.audits;
  console.log(`== ${file}`);
  console.log(`  ${r.configSettings.formFactor}/${r.configSettings.throttlingMethod} perf=${Math.round(r.categories.performance.score * 100)} FCP=${a["first-contentful-paint"].displayValue} LCP=${a["largest-contentful-paint"].displayValue} CLS=${a["cumulative-layout-shift"].displayValue}`);
  const m = a.metrics?.details?.items?.[0] ?? {};
  console.log(`  observed FCP=${Math.round(m.observedFirstContentfulPaint)} LCP=${Math.round(m.observedLargestContentfulPaint)} load=${Math.round(m.observedLoad)} | simulated FCP=${Math.round(m.firstContentfulPaint)} LCP=${Math.round(m.largestContentfulPaint)}`);
  for (const it of a["layout-shifts"]?.details?.items ?? []) console.log(`  shift ${it.score?.toFixed(3)}: ${it.node?.selector ?? ""} ${it.node?.snippet?.slice(0, 120) ?? ""}`);
  for (const it of a["layout-shift-elements"]?.details?.items ?? []) console.log(`  shift-el ${it.score?.toFixed?.(3)}: ${it.node?.selector ?? ""} ${it.node?.snippet?.slice(0, 120) ?? ""}`);
  for (const it of a["cls-culprits-insight"]?.details?.items ?? []) for (const s of it.items ?? []) console.log(`  culprit ${JSON.stringify(s).slice(0, 300)}`);
  const el = a["largest-contentful-paint-element"]?.details?.items ?? [];
  for (const block of el) {
    for (const it of block.items ?? []) {
      if (it.node) console.log(`  LCP node: ${it.node.snippet?.slice(0, 160)}`);
      else if (it.phase) console.log(`  phase ${it.phase}: ${Math.round(it.timing)}ms`);
    }
  }
  const br = a["lcp-breakdown-insight"]?.details?.items ?? [];
  for (const block of br) for (const it of block.items ?? []) if (it.subpart || it.label) console.log(`  subpart ${it.subpart ?? it.label}: ${Math.round(it.duration ?? 0)}ms`);
  const rb = a["render-blocking-insight"]?.details?.items ?? a["render-blocking-resources"]?.details?.items ?? [];
  for (const it of rb) console.log(`  render-blocking: ${it.url} ${Math.round(it.wastedMs ?? 0)}ms`);
  const reqs = a["network-requests"]?.details?.items ?? [];
  for (const i of reqs.slice(0, 22)) {
    console.log(`  ${String(Math.round(i.networkRequestTime)).padStart(5)}-${String(Math.round(i.networkEndTime)).padStart(5)} ${i.resourceType?.padEnd(10)} ${String(i.transferSize).padStart(7)} ${i.priority ?? ""} ${i.url.replace(/^https?:\/\/[^/]+/, "").slice(0, 90)}`);
  }
}
