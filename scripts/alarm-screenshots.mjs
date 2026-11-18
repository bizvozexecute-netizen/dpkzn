// Скриншоты посадочных сигнализаций (mobile 375 / desktop 1440) и список
// неудачных сетевых запросов. Использование:
//   node scripts/alarm-screenshots.mjs http://127.0.0.1:3199 docs/reports/alarm-2026/screens
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const base = process.argv[2] ?? "http://127.0.0.1:3199";
const out = process.argv[3] ?? "docs/reports/alarm-2026/screens";
mkdirSync(out, { recursive: true });

const pages = [
  ["hub", "/ustanovka-signalizacii"],
  ["avtozapusk", "/ustanovka-signalizacii/avtozapusk"],
  ["vybor-signalizacii", "/ustanovka-signalizacii/vybor-signalizacii"],
  ["starline", "/ustanovka-signalizacii/starline"],
  ["pandora", "/ustanovka-signalizacii/pandora"],
  ["home", "/"],
];
const viewports = [
  ["mobile", { width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
  ["desktop", { width: 1440, height: 900 }],
];

const browser = await chromium.launch();
let bad = 0;
for (const [vpName, vp] of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, ...vp });
  for (const [name, path] of pages) {
    const page = await ctx.newPage();
    const failed = [];
    const errors = [];
    page.on("requestfailed", (r) => failed.push(`${r.failure()?.errorText} ${r.url()}`));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    const res = await page.goto(base + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const sticky = await page.evaluate(() => {
      const el = document.querySelector("[data-sticky-cta]");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { visible: r.height > 0 && r.top < window.innerHeight && r.bottom > 0, text: el.textContent?.replace(/\s+/g, " ").trim().slice(0, 80) };
    });
    await page.screenshot({ path: join(out, `${name}-${vpName}-first-screen.png`) });
    await page.screenshot({ path: join(out, `${name}-${vpName}-full.png`), fullPage: true });
    const status = res?.status();
    if (status !== 200 || overflow) bad++;
    console.log(JSON.stringify({ vp: vpName, path, status, overflow, sticky, failed, errors }));
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(bad ? `FAIL ${bad}` : "OK all pages 200, no horizontal overflow");
process.exit(bad ? 1 : 0);
