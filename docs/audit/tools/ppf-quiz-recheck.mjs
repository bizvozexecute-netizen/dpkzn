// Повторная проверка /ppf: квиз (единственная форма заявки на странице) — валидация, полный проход,
// экран успеха и фактическая запись заявки в ИЗОЛИРОВАННЫЙ журнал (LEADS_DATA_DIR во временном каталоге,
// CRM_WEBHOOK_URL/TG_* пустые). /api/submit НЕ перехватывается — проверяется реальный ответ сервера.
// Перед отправкой выдерживается 4 с, чтобы не попасть в анти-бот отсечку (находка F12).
// Запуск: BASE=http://127.0.0.1:3100 LEADS_DB=<dir>/leads.db node docs/audit/tools/ppf-quiz-recheck.mjs docs/audit/evidence/ppf-quiz-recheck.json
import { chromium } from "playwright";
import Database from "better-sqlite3";
import fs from "node:fs";

const BASE = process.env.BASE || "http://127.0.0.1:3100";
const LEADS_DB = process.env.LEADS_DB;
const OUT = process.argv[2] || "docs/audit/evidence/ppf-quiz-recheck.json";
const SHOTS = "docs/audit/screens";
const BLOCK = /mc\.yandex|metrika|top-fwz|vk\.com\/rtrg|googletagmanager|google-analytics/;
const leads = () => {
  if (!fs.existsSync(LEADS_DB)) return { n: 0, last: null };
  const db = new Database(LEADS_DB, { readonly: true });
  try {
    const n = db.prepare("select count(*) n from leads").get().n;
    const last = db.prepare("select * from leads order by id desc limit 1").get() || null;
    return { n, last };
  } finally { db.close(); }
};

const browser = await chromium.launch();
const out = [];
for (const width of [375, 1440]) {
  const mobile = width < 768;
  const ctx = await browser.newContext({ viewport: { width, height: mobile ? 800 : 900 }, isMobile: mobile, hasTouch: mobile, locale: "ru-RU" });
  await ctx.route(BLOCK, (r) => r.abort());
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const r = { path: "/ppf", width, steps: [], consoleErrors: [], submits: [] };
  page.on("console", (m) => { if (m.type() === "error") r.consoleErrors.push(m.text().slice(0, 200)); });
  page.on("response", async (res) => { if (res.url().endsWith("/api/submit")) r.submits.push({ status: res.status(), body: (await res.text().catch(() => "")).slice(0, 200) }); });
  const before = leads().n;
  try {
    await page.goto(BASE + "/ppf", { waitUntil: "load" });
    const stepLabel = page.getByText(/^Шаг \d из \d$/).first();
    await stepLabel.scrollIntoViewIfNeeded();
    const quiz = stepLabel.locator("..").locator("..");
    r.steps.push(await stepLabel.innerText());
    await quiz.getByRole("button", { name: "Не нашли модель? Выбрать класс вручную" }).click();
    await quiz.locator(".ds-chip:visible").first().click();
    for (let i = 0; i < 5; i++) {
      r.steps.push(await page.getByText(/^Шаг \d из \d$/).first().innerText());
      if (await quiz.locator("input[type=tel]").count()) break;
      await quiz.locator(".ds-step > .space-y-3 > button").first().click();
      const next = quiz.getByRole("button", { name: "Далее", exact: true });
      if (await next.count()) await next.click();
    }
    const tel = quiz.locator("input[type=tel]");
    r.telFontSize = await tel.evaluate((el) => getComputedStyle(el).fontSize);
    r.telInputMode = await tel.getAttribute("inputmode");
    // 1) пустой телефон -> ошибка, без запроса
    await quiz.getByRole("button", { name: "Получить расчёт", exact: true }).click();
    await page.waitForTimeout(400);
    r.emptyError = (await quiz.locator("p.text-error").allInnerTexts()).join(" | ");
    // 2) неполный номер -> ошибка
    await tel.fill("+7900");
    await quiz.getByRole("button", { name: "Получить расчёт", exact: true }).click();
    await page.waitForTimeout(400);
    r.shortError = (await quiz.locator("p.text-error").allInnerTexts()).join(" | ");
    r.submitsAfterInvalid = r.submits.length;
    await page.screenshot({ path: `${SHOTS}/ppf-quiz--${width}-validation.jpg`, type: "jpeg", quality: 60 });
    // 3) корректный тестовый номер, ждём > 1,5 с анти-бот порога
    await tel.fill("+79001234567");
    await page.waitForTimeout(4000);
    await quiz.getByRole("button", { name: "Получить расчёт", exact: true }).click();
    await page.getByText("Заявка у мастера", { exact: true }).waitFor();
    r.successVisible = await page.getByText("Заявка у мастера", { exact: true }).isVisible();
    r.successText = (await page.getByText("Заявка у мастера", { exact: true }).locator("..").innerText()).replace(/\s+/g, " ");
    await page.getByText("Заявка у мастера", { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/ppf-quiz--${width}-success.jpg`, type: "jpeg", quality: 60 });
    await page.waitForTimeout(500);
    const after = leads();
    r.persistedLeadDelta = after.n - before;
    if (after.last) r.lastLead = { phoneMasked: String(after.last.phone || "").replace(/\d(?=\d{2})/g, "•"), source: after.last.source, service: after.last.service, car_class: after.last.car_class };
    r.ok = r.successVisible && r.persistedLeadDelta === 1 && r.submits.length === 1 && r.submits[0].status === 200 && r.submitsAfterInvalid === 0 && !!r.emptyError && !!r.shortError;
  } catch (e) {
    r.ok = false; r.error = String(e.message).slice(0, 300);
    await page.screenshot({ path: `${SHOTS}/ppf-quiz--${width}-error.jpg`, type: "jpeg", quality: 60 }).catch(() => {});
  }
  console.log(JSON.stringify(r));
  out.push(r);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
process.exit(out.every((x) => x.ok) ? 0 : 1);
