import { readFileSync } from "node:fs";
for (const f of process.argv.slice(2)) {
  const r = JSON.parse(readFileSync(f, "utf8"));
  const a = r.audits;
  console.log("==", f.split("/").pop(), "LCP", a["largest-contentful-paint"].numericValue | 0, "TBT", a["total-blocking-time"].numericValue | 0);
  for (const i of a["bootup-time"]?.details?.items?.slice(0, 8) ?? [])
    console.log("  boot", String(i.total | 0).padStart(5), "script", String(i.scripting | 0).padStart(5), i.url.replace(/^https?:\/\/[^/]+/, "").slice(0, 80));
  for (const i of a["mainthread-work-breakdown"]?.details?.items ?? []) console.log("  mt", i.groupLabel, i.duration | 0);
  for (const i of a["unused-javascript"]?.details?.items?.slice(0, 6) ?? [])
    console.log("  unusedJS", i.wastedBytes, "/", i.totalBytes, i.url.replace(/^https?:\/\/[^/]+/, "").slice(0, 80));
  for (const i of a["unused-css-rules"]?.details?.items ?? []) console.log("  unusedCSS", i.wastedBytes, "/", i.totalBytes, i.url.slice(-30));
  console.log("  dom", a["dom-size"]?.displayValue, "| fonts", (a["network-requests"].details.items.filter((x) => x.resourceType === "Font").length));
}
