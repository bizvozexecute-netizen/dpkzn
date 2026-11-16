// Playwright smoke: обходит все страницы на мобильном вьюпорте (375x812),
// проверяет HTTP 200, наличие H1, отсутствие битых картинок и console errors.
// Использование: сервер должен быть запущен (npm run start), затем: node scripts/smoke.mjs
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE || "http://localhost:3000";
const SERVICES = [
  "ppf", "polirovka", "himchistka", "shumoizolyaciya", "antihrom", "tonirovka",
  "ustanovka-linz", "regulirovka-far", "polirovka-stekol", "polirovka-far",
  "antidozhd", "remont-vmyatin", "zashchitnye-pokrytiya", "ustanovka-signalizacii",
  "broneplenka", "oklejka-avto", "detayling-kuzova", "vyezdnoj-detayling",
  "antikor", // страница-мост: услуги нет, переливает на плёнку и керамику (23.09)
];
const PAGES = ["/", ...SERVICES.map((s) => `/${s}`), "/blog", "/portfolio", "/about", "/contacts", "/privacy"];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
let failures = 0;

for (const path of PAGES) {
  const page = await ctx.newPage();
  const errors = [];
  const badResponses = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("response", (r) => {
    if (r.status() >= 400 && new URL(r.url()).pathname.match(/\.(webp|png|jpe?g|svg|css|js)$/i))
      badResponses.push(`${r.status()} ${new URL(r.url()).pathname}`);
  });

  try {
    const resp = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 30000 });
    const status = resp?.status();
    const h1 = await page.locator("h1").count();
    const problems = [];
    if (status !== 200) problems.push(`HTTP ${status}`);
    if (h1 < 1) problems.push("no h1");
    if (badResponses.length) problems.push(`broken assets: ${badResponses.join(", ")}`);
    if (errors.length) problems.push(`console errors: ${errors.slice(0, 3).join(" | ")}`);
    if (problems.length) {
      failures++;
      console.log(`FAIL ${path} — ${problems.join("; ")}`);
    } else {
      console.log(`OK   ${path}`);
    }
  } catch (e) {
    failures++;
    console.log(`FAIL ${path} — ${e.message.split("\n")[0]}`);
  }
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} page(s) failed` : "\nAll pages passed");
process.exit(failures ? 1 : 0);
