// Аудит публичных страниц dpkzn.ru на локальной сборке (next start).
// Запуск: BASE=http://127.0.0.1:3100 node docs/audit/tools/audit.mjs <pages.json> <out.json>
// Заявки НЕ уходят: /api/submit перехватывается и отвечает заглушкой,
// Метрика и прочие внешние трекеры заблокированы.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE || "http://127.0.0.1:3100";
const [pagesFile, outFile] = process.argv.slice(2);
const pages = JSON.parse(fs.readFileSync(pagesFile, "utf8"));
const SHOTS = path.resolve(process.env.SHOTS || "docs/audit/screens");
fs.mkdirSync(SHOTS, { recursive: true });
const BLOCK = /mc\.yandex|metrika|top-fwz|vk\.com\/rtrg|googletagmanager|google-analytics/;

const slug = (p) => (p === "/" ? "home" : p.replace(/^\//, "").replace(/[^a-z0-9-]+/gi, "_"));

async function inspect(page, width) {
  return page.evaluate((width) => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05;
    };
    const desc = (el) => {
      const t = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("alt") || el.value || "").trim().replace(/\s+/g, " ").slice(0, 50);
      const cls = (el.className && el.className.baseVal === undefined ? String(el.className) : "").split(" ").slice(0, 3).join(".");
      return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${t ? ` «${t}»` : ""}`;
    };
    const iw = window.innerWidth;
    const doc = document.documentElement;
    // 1. горизонтальный скролл
    const overflow = doc.scrollWidth > iw + 1;
    const offenders = [];
    if (overflow) {
      for (const el of document.body.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.right > iw + 1 && r.width > 0 && vis(el)) {
          const parentOff = el.parentElement && el.parentElement.getBoundingClientRect().right > iw + 1;
          if (!parentOff) offenders.push({ el: desc(el), right: Math.round(r.right) });
        }
        if (offenders.length >= 6) break;
      }
    }
    // 2. тап-зоны
    const taps = [];
    for (const el of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], summary")) {
      if (!vis(el) || el.closest("[aria-hidden=true]") || el.tabIndex < 0 && el.tagName === "INPUT") continue;
      const r = el.getBoundingClientRect();
      const inline = el.tagName === "A" && el.closest("p, li, td, figcaption") && getComputedStyle(el).display === "inline";
      if (inline) continue;
      if (r.width < 44 || r.height < 44) taps.push({ el: desc(el), w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top + scrollY) });
    }
    // 3. inputs < 16px
    const smallInputs = [...document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select")]
      .filter((el) => vis(el) && el.tabIndex >= 0 && parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => ({ el: desc(el), fs: getComputedStyle(el).fontSize }));
    // 4. контраст (упрощённо: сплошной фон-предок, без фоновых картинок)
    const parse = (c) => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : null; };
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const blend = (fg, bg) => { const a = fg[3] ?? 1; return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)); };
    const lowContrast = [];
    let checkedText = 0;
    const seen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim() || node.textContent.trim().length < 2) continue;
      const el = node.parentElement;
      if (!el || seen.has(el) || !vis(el)) continue;
      seen.add(el);
      const s = getComputedStyle(el);
      let fg = parse(s.color); if (!fg) continue;
      let bg = null, img = false;
      for (let p = el; p; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (ps.backgroundImage !== "none" && !ps.backgroundImage.startsWith("linear-gradient(rgba(0, 0, 0, 0)")) { img = true; break; }
        const b = parse(ps.backgroundColor);
        if (b && (b[3] ?? 1) > 0.9) { bg = b; break; }
        if (p.tagName === "VIDEO" || p.querySelector?.(":scope > img, :scope > video, :scope > picture")) { /* ignore */ }
      }
      if (img) continue;
      if (!bg) bg = [10, 10, 12];
      fg = blend(fg, bg);
      const L1 = lum(fg), L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const size = parseFloat(s.fontSize), bold = parseInt(s.fontWeight) >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      checkedText++;
      if (ratio < (large ? 3 : 4.5)) lowContrast.push({ el: desc(el), ratio: Math.round(ratio * 100) / 100, color: s.color, fs: s.fontSize });
    }
    // 5. изображения
    const imgs = [...document.images];
    const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== "lazy" && i.src).map((i) => i.src.slice(-80));
    const noAlt = imgs.filter((i) => !i.hasAttribute("alt")).map((i) => i.src.slice(-60));
    const upscaled = imgs.filter((i) => vis(i) && i.naturalWidth && i.getBoundingClientRect().width > i.naturalWidth * 1.15).map((i) => ({ src: i.currentSrc.slice(-60), shown: Math.round(i.getBoundingClientRect().width), natural: i.naturalWidth }));
    // 6. структура / конверсия
    const h1 = [...document.querySelectorAll("h1")].map((h) => h.innerText.trim().replace(/\s+/g, " "));
    const vh = window.innerHeight;
    const firstScreen = [...document.querySelectorAll("a, button, input")].filter((el) => vis(el) && el.getBoundingClientRect().top < vh && el.getBoundingClientRect().bottom > 0);
    const ctaFirst = firstScreen.filter((el) => /расч|заявк|запис|узнать|получить|стоимост|позвон|подобр/i.test(el.innerText || el.value || "") || el.type === "tel").map(desc).slice(0, 5);
    const telFirst = firstScreen.some((el) => (el.getAttribute("href") || "").startsWith("tel:"));
    const msgFirst = firstScreen.some((el) => /wa\.me|t\.me|max\.ru/.test(el.getAttribute("href") || ""));
    const links = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
    const anchorsMissing = links.filter((h) => h.startsWith("#") && h.length > 1 && !document.getElementById(decodeURIComponent(h.slice(1)))).filter((v, i, a) => a.indexOf(v) === i);
    const forms = document.querySelectorAll("form").length;
    const tels = [...document.querySelectorAll("input[type=tel]")].filter(vis).length;
    const priceEls = [...document.querySelectorAll("body *")].filter((el) => el.children.length === 0 && /\d[\d\s ]*₽/.test(el.textContent || "") && vis(el));
    const H = doc.scrollHeight;
    const firstPriceY = priceEls.length ? Math.round(priceEls[0].getBoundingClientRect().top + scrollY) : null;
    const fixed = [...document.querySelectorAll("body *")].filter((el) => { const p = getComputedStyle(el).position; return (p === "fixed" || p === "sticky") && vis(el); })
      .map((el) => { const r = el.getBoundingClientRect(); return { el: desc(el).slice(0, 70), pos: getComputedStyle(el).position, top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width) }; }).slice(0, 8);
    // 7. JSON-LD
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
      try { const j = JSON.parse(s.textContent); const arr = Array.isArray(j) ? j : j["@graph"] || [j]; return arr.map((x) => x["@type"]).flat().join("+"); } catch (e) { return "PARSE_ERROR"; }
    });
    const placeholders = [...document.querySelectorAll("body *")].filter((el) => el.children.length === 0 && /lorem|placeholder|TODO|undefined|NaN|null ₽|\[object/i.test(el.textContent || "") && vis(el)).map(desc).slice(0, 5);
    const videos = [...document.querySelectorAll("video")].map((v) => ({ poster: !!v.poster, autoplay: v.autoplay, muted: v.muted, playsInline: v.playsInline, src: (v.currentSrc || "").slice(-50) }));
    return {
      width, title: document.title, desc: document.querySelector('meta[name="description"]')?.content?.length ?? 0,
      canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
      robots: document.querySelector('meta[name="robots"]')?.content ?? null,
      overflow, scrollWidth: doc.scrollWidth, offenders, taps: taps.slice(0, 40), tapCount: taps.length,
      smallInputs, lowContrast: lowContrast.slice(0, 15), lowContrastCount: lowContrast.length, checkedText,
      broken, noAlt: noAlt.slice(0, 5), noAltCount: noAlt.length, upscaled: upscaled.slice(0, 5), h1, ctaFirst, telFirst, msgFirst,
      anchorsMissing, forms, tels, height: H, firstPriceY, priceCount: priceEls.length, fixed, ld, placeholders, videos,
      waLinks: links.filter((h) => /wa\.me/.test(h)).length, tgLinks: links.filter((h) => /t\.me/.test(h)).length, telLinks: links.filter((h) => h.startsWith("tel:")).length,
    };
  }, width);
}

async function formTest(page) {
  const res = { steps: [] };
  const captured = [];
  await page.route("**/api/submit", async (route) => {
    captured.push(route.request().postData()?.slice(0, 400) ?? "(multipart)");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, ok: true, test: true }) });
  });
  // квиз: проходим шаги, если он есть
  const quizStep = page.getByText(/Шаг 1 из \d/).first();
  if (await quizStep.count()) {
    res.quiz = { total: Number((await quizStep.innerText()).match(/из (\d)/)[1]) };
    const box = quizStep.locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
    for (let i = 0; i < 6; i++) {
      if (await box.locator("input[type=tel]").count()) break;
      const opts = box.locator(".ds-step button:visible, .ds-step [role=radio]:visible");
      const n = await opts.count();
      if (!n) break;
      await opts.first().click();
      await page.waitForTimeout(300);
      const next = box.getByRole("button", { name: /Далее|Дальше|Продолжить/ });
      if (await next.count() && await next.first().isEnabled()) { await next.first().click(); await page.waitForTimeout(300); }
    }
    const tel = box.locator("input[type=tel]");
    res.quiz.reachedContact = (await tel.count()) > 0;
    if (res.quiz.reachedContact) {
      await box.getByRole("button", { name: /Получить расчёт/ }).click();
      await page.waitForTimeout(400);
      res.quiz.emptyError = (await box.innerText()).match(/Введите[^\n]*|номер[^\n]*/i)?.[0] ?? null;
      await tel.fill("9001234567");
      await box.getByRole("button", { name: /Получить расчёт/ }).click();
      await page.waitForTimeout(1200);
      res.quiz.success = /Заявка|Спасибо|получили|мастер/i.test(await box.innerText().catch(() => ""));
      res.quiz.sent = captured.length;
    }
  }
  // LeadForm (первая видимая)
  const form = page.locator("form.ds-lead-form:visible").first();
  if (await form.count()) {
    const before = captured.length;
    await form.scrollIntoViewIfNeeded();
    await form.locator("button[type=submit]").click();
    await page.waitForTimeout(400);
    res.lead = { emptyError: (await form.locator("[role=alert]").innerText().catch(() => "")).trim() || null };
    await form.locator("input[type=tel]").fill("123");
    await form.locator("button[type=submit]").click();
    await page.waitForTimeout(400);
    res.lead.shortError = (await form.locator("[role=alert]").innerText().catch(() => "")).trim() || null;
    await form.locator("input[type=tel]").fill("");
    await form.locator("input[type=tel]").pressSequentially("9001234567");
    res.lead.masked = await form.locator("input[type=tel]").inputValue();
    await form.locator("button[type=submit]").click();
    await page.waitForTimeout(1500);
    res.lead.sent = captured.length - before;
    res.lead.success = (await page.locator("[role=status]").count()) > 0;
    res.lead.statusText = (await page.locator("[role=status]").first().innerText().catch(() => "")).slice(0, 120);
  }
  res.payloads = captured.slice(0, 2);
  return res;
}

const out = [];
const browser = await chromium.launch();
for (const p of pages) {
  for (const width of p.widths) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 800 : 900 }, isMobile: width < 768, hasTouch: width < 768, deviceScaleFactor: 1, locale: "ru-RU" });
    await ctx.route(BLOCK, (r) => r.abort());
    const page = await ctx.newPage();
    const consoleErrors = [], failed = [];
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 200)));
    page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message.slice(0, 200)));
    page.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(BASE)) failed.push(`${r.status()} ${r.url().replace(BASE, "")}`); });
    const rec = { path: p.path, template: p.template, width };
    try {
      const resp = await page.goto(BASE + p.path, { waitUntil: "load", timeout: 45000 });
      rec.status = resp.status();
      const chain = []; for (let r = resp.request().redirectedFrom(); r; r = r.redirectedFrom()) chain.push(r.url());
      rec.redirects = chain;
      await page.waitForTimeout(1200);
      // прокрутка до конца — подгрузить lazy и вызвать reveal
      await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
      await page.waitForTimeout(600);
      const base = `${slug(p.path)}--${width}`;
      await page.screenshot({ path: `${SHOTS}/${base}-fold.jpg`, type: "jpeg", quality: 55 });
      rec.shotFold = `screens/${base}-fold.jpg`;
      if (p.full?.includes(width)) {
        const h = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.screenshot({ path: `${SHOTS}/${base}-full.jpg`, type: "jpeg", quality: 40, fullPage: true, clip: { x: 0, y: 0, width, height: Math.min(h, 14000) } });
        rec.shotFull = `screens/${base}-full.jpg`;
      }
      Object.assign(rec, await inspect(page, width));
      // скриншот проблемного места: горизонтальный скролл
      if (rec.overflow) {
        await page.evaluate(() => { const iw = innerWidth; for (const el of document.body.querySelectorAll("*")) { const r = el.getBoundingClientRect(); if (r.right > iw + 1 && r.width > 0 && !(el.parentElement && el.parentElement.getBoundingClientRect().right > iw + 1)) { el.style.outline = "3px solid red"; el.scrollIntoView({ block: "center" }); break; } } });
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${SHOTS}/${base}-overflow.jpg`, type: "jpeg", quality: 55 });
        rec.shotOverflow = `screens/${base}-overflow.jpg`;
      }
      if (p.forms?.includes(width)) {
        await page.evaluate(() => scrollTo(0, 0));
        rec.formTest = await formTest(page);
        await page.screenshot({ path: `${SHOTS}/${base}-form.jpg`, type: "jpeg", quality: 55 });
        rec.shotForm = `screens/${base}-form.jpg`;
      }
    } catch (e) { rec.error = String(e.message).slice(0, 300); }
    rec.consoleErrors = consoleErrors.slice(0, 8); rec.failed = [...new Set(failed)].slice(0, 8);
    out.push(rec);
    process.stdout.write(`${rec.status ?? "ERR"} ${p.path} @${width} ovf=${rec.overflow} taps=${rec.tapCount} lc=${rec.lowContrastCount} err=${consoleErrors.length}\n`);
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
