/**
 * Скриншоты страниц для чекпойнтов фаз редизайна.
 *
 * Запуск:  node scripts/shots.mjs <label> <url...>
 * Пример:  node scripts/shots.mjs phase1 /ppf
 * Выход:   docs/redesign/shots/<label>/<page>-{mobile,desktop}.png
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const [label, ...rawUrls] = process.argv.slice(2);
// Git Bash подменяет /dev/ui на путь вида C:/Program Files/Git/dev/ui —
// принимаем и «dev/ui», и уже испорченный абсолютный путь.
const urls = rawUrls.map((u) => {
  const cleaned = u.replace(/^[A-Za-z]:[\/].*?Git/, "");
  return cleaned.startsWith("/") ? cleaned : "/" + cleaned;
});
if (!label || urls.length === 0) {
  console.error("Использование: node scripts/shots.mjs <label> <url...>");
  process.exit(1);
}

const BASE = process.env.BASE_URL || "http://localhost:3100";
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
  { name: "desktop", width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 },
];

const OUT = path.join("docs/redesign/shots", label);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
    locale: "ru-RU",
  });
  const page = await ctx.newPage();
  for (const url of urls) {
    await page.goto(BASE + url, { waitUntil: "networkidle" });
    // Догоняем ленивые блоки и scroll-reveal, потом возвращаемся наверх.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    const name = (url === "/" ? "home" : url.replace(/^\//, "").replace(/\//g, "__")) + `-${vp.name}.png`;
    await page.screenshot({ path: path.join(OUT, name), fullPage: true });
    console.log(path.join(OUT, name));
  }
  await ctx.close();
}
await browser.close();
