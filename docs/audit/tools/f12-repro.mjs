// Воспроизведение F12: быстрая отправка формы (< MIN_FILL_MS после монтирования)
// на /ustanovka-signalizacii/avtozapusk. Ожидаемый дефект: UI показывает «Заявка принята»,
// а сервер молча отбрасывает заявку ловушкой (лог «отброшено ловушкой ... elapsed=N»),
// в журнал лидов ничего не пишется.
// Запуск только против локального сервера с LEADS_DATA_DIR во временном каталоге
// и пустыми CRM_WEBHOOK_URL / TG_* (реальные лиды не уходят).
import Database from "better-sqlite3";
import { existsSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://127.0.0.1:3100";
const LEADS = (process.env.LEADS_DATA_DIR || "/tmp/dp-f12") + "/leads.db";
const OUT = process.env.OUT_DIR || "docs/audit/screens";
const count = () => { if (!existsSync(LEADS)) return 0; const db = new Database(LEADS, { readonly: true }); try { return db.prepare("SELECT count(*) n FROM leads").get().n; } catch { return 0; } finally { db.close(); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true, locale: "ru-RU" });
await ctx.route(/mc\.yandex|metrika|top-fwz|vk\.com\/rtrg|googletagmanager|google-analytics/, (r) => r.abort());
const bodies = []; const responses = [];
ctx.on("request", (r) => { if (r.url().endsWith("/api/submit")) { try { bodies.push(r.postDataJSON()); } catch {} } });
ctx.on("response", async (r) => { if (r.url().endsWith("/api/submit")) responses.push({ status: r.status(), body: (await r.text().catch(() => "")).slice(0, 200) }); });
const page = await ctx.newPage();
const before = count();
await page.goto(`${BASE}/ustanovka-signalizacii/avtozapusk?utm_source=yandex&utm_medium=cpc&utm_campaign=audit_test&yclid=999000111`, { waitUntil: "domcontentloaded" });
const tel = page.locator("input[type=tel]:visible").first();
await tel.waitFor();
// Имитация автозаполнения + быстрого тапа: без ожидания порога 1,5 с.
await tel.fill("+79001234567");
await tel.locator("xpath=ancestor::form[1]").locator("button[type=submit]").first().click();
await page.waitForTimeout(1500);
const confirmation = await page.getByText(/принят/i).first().isVisible().catch(() => false);
await tel.locator("xpath=ancestor::form[1]").scrollIntoViewIfNeeded().catch(() => {});
await page.screenshot({ path: `${OUT}/f12-avtozapusk--375-fast-submit.jpg`, type: "jpeg", quality: 60 });
const after = count();
const result = { url: page.url(), confirmationVisible: confirmation, elapsedMsSent: bodies[0]?.elapsedMs, apiResponses: responses, leadsBefore: before, leadsAfter: after, persistedLeadDelta: after - before, shot: `${OUT}/f12-avtozapusk--375-fast-submit.jpg` };
console.log(JSON.stringify(result, null, 2));
writeFileSync(process.env.RESULT || "/tmp/f12-result.json", JSON.stringify(result, null, 2));
await browser.close();
