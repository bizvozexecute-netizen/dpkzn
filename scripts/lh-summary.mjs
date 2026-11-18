// Сводка по отчётам Lighthouse: node scripts/lh-summary.mjs <report.json> [--net]
import { readFileSync } from "node:fs";

const [file, flag] = process.argv.slice(2);
const r = JSON.parse(readFileSync(file, "utf8"));
const a = r.audits;
const c = r.categories;
const pct = (x) => Math.round(x.score * 100);
console.log(
  file.split("/").pop(),
  `formFactor=${r.configSettings.formFactor}`,
  `perf=${pct(c.performance)}`,
  c.accessibility ? `a11y=${pct(c.accessibility)}` : "",
  c["best-practices"] ? `bp=${pct(c["best-practices"])}` : "",
  c.seo ? `seo=${pct(c.seo)}` : "",
  `FCP=${a["first-contentful-paint"].displayValue}`,
  `LCP=${a["largest-contentful-paint"].displayValue}`,
  `TBT=${a["total-blocking-time"].displayValue}`,
  `CLS=${a["cumulative-layout-shift"].displayValue}`,
);
const m = a.metrics?.details?.items?.[0] ?? {};
console.log(
  "  observed: FCP", m.observedFirstContentfulPaint, "LCP", m.observedLargestContentfulPaint, "load", m.observedLoad,
  "| benchmarkIndex", r.environment?.benchmarkIndex, "| throttling", r.configSettings.throttlingMethod,
);
if (flag === "--net") {
  const lcp = a["largest-contentful-paint-element"]?.details?.items ?? [];
  console.log("LCP element/phases:", JSON.stringify(lcp.map((i) => i.items?.map((x) => x.node?.selector ?? `${x.phase}:${Math.round(x.timing)}`))));
  for (const i of a["network-requests"].details.items.slice(0, 40)) {
    console.log(Math.round(i.networkRequestTime), Math.round(i.networkEndTime), i.resourceType, i.priority, `${Math.round(i.transferSize / 1024)}KB`, i.url.replace(/^https?:\/\/[^/]+/, ""));
  }
  console.log("bootup", JSON.stringify(a["bootup-time"].details.items.slice(0, 6).map((x) => [x.url.slice(-60), Math.round(x.total)])));
}
