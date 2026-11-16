/**
 * Верификация «Анатомии детейлинга» после переработки под мобайл.
 *
 * Запуск: node scripts/anatomy-verify.mjs  (сервер на :3100 должен работать)
 *
 * Проверяет на 390×844 (touch):
 *  1. тапабельность всех зон на их домашних станциях: экранный bbox зоны
 *     после авто-пана ≥44px по меньшей стороне ИЛИ ≥88×28;
 *  2. реальный тап по центру зоны открывает нижний шит с её названием,
 *     мобильная панель sticky CTA прячется, крестик закрывает и возвращает её;
 *  3. горизонтальный пан двигает окно кропа и не скроллит страницу,
 *     вертикальный свайп скроллит страницу;
 *  4. перелёт в кропе не теряет машину (кадры на 25/50/75% полёта не пустые);
 *  5. CLS секции ≤ 0.05 при инициализации.
 * И на 1440×900: тултип у курсора, sticky-колонка.
 */

import { chromium } from "playwright";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import sharp from "sharp";

/** Точка гарантированно внутри маски: белый пиксель, ближайший к центроиду
 *  (центр bbox у вогнутых зон — крыша-полоска, бампер, колесо — мимо маски). */
function insidePoint(station, zoneNumber, xLo = 0, xHi = 1) {
  return insidePointFile(`public/anatomy/index_${station}.png`, zoneNumber, xLo, xHi);
}

/** То же по произвольной индексной карте (зонные карты спина §3.2).
 *  match: число — сравнение с каналом R (станционный формат), либо [r,g,b] —
 *  точный цвет палитры спина. */
async function insidePointFile(file, match, xLo = 0, xHi = 1) {
  // возвращает [x, y, глубина эрозии]; точка — из индексной карты (истина
  // хит-теста): у тонких зон маска и индекс на границах расходятся
  const meta = await sharp(file).metadata();
  const raw = await sharp(file).raw().toBuffer();
  const ch = raw.length / (meta.width * meta.height);
  const W = meta.width, H = meta.height;
  const hit = Array.isArray(match)
    ? (i) => raw[i * ch] === match[0] && raw[i * ch + 1] === match[1] && raw[i * ch + 2] === match[2]
    : (i) => raw[i * ch] === match;
  let cur = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) cur[i] = hit(i) ? 1 : 0;
  const rawZone = cur;
  // эрозия: остаётся «сердцевина» зоны — тап туда не промахнётся даже на
  // тонкой крыше и колесе со спицами (после ресайза дырки спиц зарастают)
  let lastAlive = cur;
  let depth = 0;
  for (let pass = 0; pass < 10; pass++) {
    const next = new Uint8Array(W * H);
    let alive = 0;
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (cur[i] && cur[i - 1] && cur[i + 1] && cur[i - W] && cur[i + W]) { next[i] = 1; alive++; }
      }
    if (!alive) break;
    depth = pass + 1;
    lastAlive = next;
    cur = next;
  }
  // точка обязана попадать в видимое окно кропа; берём МЕДИАННЫЙ пиксель
  // «сердцевины» — центроид у изогнутых полос (крыша) лежит вне зоны,
  // и ближайший к нему пиксель оказывался на кромке
  const inWindow = (i) => { const fx = ((i % W) + 0.5) / W; return fx >= xLo && fx <= xHi; };
  // сердцевина может целиком лежать вне окна (толстая часть крыши справа) —
  // тогда спускаемся к сырым пикселям зоны внутри окна
  for (const layer of [lastAlive, rawZone]) {
    const alive = [];
    for (let i = 0; i < W * H; i++) if (layer[i] && inWindow(i)) alive.push(i);
    if (alive.length) {
      const mid = alive[Math.floor(alive.length / 2)];
      return [((mid % W) + 0.5) / W, (((mid / W) | 0) + 0.5) / H, layer === lastAlive ? depth : 1];
    }
  }
  return null;
}

const BASE = "http://localhost:3100";
const indexMap = JSON.parse(readFileSync("public/anatomy/index_map.json", "utf8"));
const anatomy = JSON.parse(readFileSync("public/anatomy/anatomy.json", "utf8"));
// Домашние станции зон переопределены в коде (anatomy-home-stations.json): пакет
// v1.4 вернул их на крупные планы, где маска заливает весь кроп на телефоне
const homeStations = JSON.parse(readFileSync("src/lib/redesign/anatomy-home-stations.json", "utf8"));
for (const z of anatomy.zones) if (homeStations[z.id]) z.station = homeStations[z.id];

let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? "✓" : "✗"} ${label}`);
  if (!cond) failures++;
};

const S0 = anatomy.order[0];
const V13 = parseFloat(anatomy.meta?.version ?? "0") >= 1.3;
/** Текст чипа станции: у «Обзора» при активном спине — суффикс 360° */
const chipLabel = (st) =>
  st === S0 && anatomy.spin ? `${anatomy.stations[st].label} · 360°` : anatomy.stations[st].label;

/* ── Ассетные проверки масок и геометрии спина (§11, §3.2) ── */
if (V13) {
  const [doors, rockers] = await Promise.all(
    ["front_doors", "rockers"].map((z) =>
      sharp(`public/anatomy/mask_S3_${z}.png`).greyscale().raw().toBuffer({ resolveWithObject: true }),
    ),
  );
  let overlap = 0;
  for (let i = 0; i < doors.data.length; i++) if (doors.data[i] > 127 && rockers.data[i] > 127) overlap++;
  ok(overlap === 0, `S3: front_doors ∩ rockers == ${overlap} px (двери лишились полосы порога)`);

  // Порог непрерывен от арки до арки. С v1.4 маски прошли фильтр
  // связных компонент < 50 px, поэтому считаем КАЖДЫЙ пиксель и требуем
  // нулевого разрыва: раньше банд-фильтр прятал АА-крапинки рендера.
  const { data: rd, info } = rockers;
  const cols = new Array(info.width).fill(0);
  for (let p = 0; p < rd.length; p++) if (rd[p] > 127) cols[p % info.width]++;
  const xs = cols.flatMap((c, x) => (c ? [x] : []));
  let maxGap = 0;
  let gap = 0;
  for (let x = xs[0]; x <= xs.at(-1); x++) {
    if (cols[x]) gap = 0;
    else if (++gap > maxGap) maxGap = gap;
  }
  const span = xs.at(-1) - xs[0];
  ok(
    maxGap === 0 && span > info.width * 0.5,
    `S3: порог непрерывен от арки до арки (полоса ${xs[0]}..${xs.at(-1)}, разрывов ${maxGap})`,
  );
} else {
  console.log(`- маски: ассеты v${anatomy.meta?.version ?? "?"} — проверки §11 ждут v1.3`);
}

/* Геометрия спина: кадр и зонная карта разного размера (1920 и 1280
   в v1.4) — хит-тест работает в долях кадра, поэтому совпадать обязаны
   АСПЕКТЫ, а не пиксели; расхождение сдвинет попадания по вертикали. */
if (anatomy.spin) {
  const sp = anatomy.spin;
  const pat = (t) => `public/anatomy/${(t ?? "").replace(/\{i:02d\}|\{nn\}/, "17")}`;
  const [beauty, zones] = await Promise.all([
    sharp(pat(sp.beautyPattern ?? sp.beauty)).metadata(),
    sharp(pat(sp.zonesPattern ?? sp.zones)).metadata(),
  ]);
  const still = await sharp(`public/anatomy/${anatomy.stations[S0].still}`).metadata();
  ok(
    beauty.width === still.width && beauty.height === still.height,
    `спин: кадр ${beauty.width}×${beauty.height} == стилл S0 ${still.width}×${still.height} (резкость не падает при вращении)`,
  );
  if (sp.frameWidth) {
    ok(
      beauty.width === sp.frameWidth && beauty.height === sp.frameHeight,
      `спин: фактический кадр совпадает с frameWidth/Height из anatomy.json`,
    );
  }
  const ar = (m) => m.width / m.height;
  const diff = Math.abs(ar(beauty) - ar(zones)) / ar(beauty);
  ok(
    diff < 0.005,
    `спин: аспект карты ${zones.width}×${zones.height} совпадает с кадром (расхождение ${(diff * 100).toFixed(2)}%)`,
  );

  // Палитра в index_map.json обязана повторять словарь рендера
  const paletteFile = ["public/anatomy/zone_palette.json", "docs/redesign/zone_palette.json"].find((f) =>
    existsSync(f),
  );
  if (paletteFile && indexMap.spin?.palette) {
    const ref = JSON.parse(readFileSync(paletteFile, "utf8"));
    const mismatch = Object.entries(ref).filter(([zone, [r, g, b]]) => {
      const hex = `#${(((r << 16) | (g << 8) | b) >>> 0).toString(16).padStart(6, "0").toUpperCase()}`;
      return indexMap.spin.palette[zone] !== hex;
    });
    ok(
      mismatch.length === 0,
      `спин: палитра index_map == ${paletteFile} (расхождений ${mismatch.length})`,
    );
  }
}

/* Зоны вне хит-теста всё равно горят: masks ⊇ stations */
if (indexMap.masks) {
  const bad = anatomy.order.filter((st) => {
    const hit = new Set(indexMap.stations[st] ?? []);
    return (indexMap.masks[st] ?? []).length < hit.size || [...hit].some((z) => !(indexMap.masks[st] ?? []).includes(z));
  });
  const extra = anatomy.order.reduce(
    (n, st) => n + ((indexMap.masks[st]?.length ?? 0) - (indexMap.stations[st]?.length ?? 0)),
    0,
  );
  ok(bad.length === 0, `подсветка шире хит-теста: masks ⊇ stations (вырожденных зон ${extra})`);
}

/* Прямые пролёты между несоседними станциями: список в коде обязан совпадать
   с файлами пакета в обе стороны — иначе новый клип из рендера молча не
   включится, а вписанная пара без файла уронит полёт в 404. */
const directFlights = JSON.parse(readFileSync("src/lib/redesign/anatomy-direct-flights.json", "utf8")).pairs;
{
  const files = readdirSync("public/anatomy")
    .filter((f) => /^flight_S\d+_S\d+\.mp4$/.test(f))
    .map((f) => f.slice(7, -4));
  const adjacent = new Set();
  for (let i = 0; i + 1 < anatomy.order.length; i++) {
    adjacent.add(`${anatomy.order[i]}_${anatomy.order[i + 1]}`);
    adjacent.add(`${anatomy.order[i + 1]}_${anatomy.order[i]}`);
  }
  const missingAdjacent = [...adjacent].filter((pair) => !files.includes(pair));
  const unlisted = files.filter((pair) => !adjacent.has(pair) && !directFlights.includes(pair));
  const noFile = directFlights.filter((pair) => !files.includes(pair));
  ok(missingAdjacent.length === 0, `пролёты: клипы между соседями есть все (${adjacent.size}; нет: ${missingAdjacent.join(", ") || "—"})`);
  ok(unlisted.length === 0, `пролёты: прямые клипы пакета вписаны в anatomy-direct-flights.json (не вписаны: ${unlisted.join(", ") || "—"})`);
  ok(noFile.length === 0, `пролёты: у каждой вписанной пары есть файл (без файла: ${noFile.join(", ") || "—"})`);
}

/* Маски обязаны иметь альфу и не заливать кадр целиком.
   Пакет рендера отдаёт их одноканальными: CSS mask-image читает альфу, а она
   сплошная — зона золотила весь экран на iPhone (владелец 03.09). Лечится
   `node scripts/anatomy-mask-alpha.mjs`, и эта проверка не даст следующему
   пакету ассетов молча вернуть проблему — как уже было с домашними станциями. */
{
  const masks = readdirSync("public/anatomy").filter((f) => f.startsWith("mask_") && f.endsWith(".png"));
  const noAlpha = [];
  const flooding = [];
  for (const f of masks) {
    const file = `public/anatomy/${f}`;
    const meta = await sharp(file).metadata();
    if (!meta.hasAlpha) {
      noAlpha.push(f);
      continue;
    }
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let on = 0;
    for (let i = 3; i < data.length; i += info.channels) if (data[i] > 16) on++;
    if (on / (info.width * info.height) > 0.6) flooding.push(f);
  }
  ok(noAlpha.length === 0, `маски: альфа-канал есть у всех ${masks.length} (без альфы: ${noAlpha.length})`);
  ok(flooding.length === 0, `маски: ни одна не заливает кадр целиком (>60%: ${flooding.join(", ") || "нет"})`);
}

const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });

/** Ждём посадку камеры на станцию (активный чип станции = label). */
async function waitStation(p, label, timeout = 9000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const cur = await p.locator("div.mb-4 button.border-accent").innerText().catch(() => "");
    if (cur === label) return true;
    await p.waitForTimeout(150);
  }
  return false;
}

/* ── Мобайл ── */
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.route("**mc.yandex.ru**", (r) => r.abort());

  // CLS в окне инициализации анатомии (счётчики hero и загрузка страницы —
  // не предмет этой проверки; их меряет Lighthouse-гейт)
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    window.__cls = 0;
    window.__clsSrc = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        if (!e.hadRecentInput) {
          window.__cls += e.value;
          for (const src of e.sources ?? [])
            if (src.node) window.__clsSrc.push(`${e.value.toFixed(3)} ${src.node.nodeName}.${src.node.className?.toString?.().slice(0, 40)}`);
        }
    }).observe({ type: "layout-shift" });
  });
  const sec = p.locator('[data-gate-new*="Анатомия"]');
  await sec.scrollIntoViewIfNeeded();
  await p.waitForTimeout(2500);
  const cls = await p.evaluate(() => window.__cls);
  ok(cls <= 0.05, `CLS при инициализации анатомии: ${cls.toFixed(4)} ≤ 0.05`);
  if (cls > 0.05) console.log("  сдвиги:", await p.evaluate(() => window.__clsSrc.slice(0, 8)));

  const frame = p.locator(".ds-anatomy-frame");
  const wrap = p.locator(".ds-anatomy-crop");

  // 1+2: по каждой зоне на её домашней станции
  const zonesByStation = {};
  for (const z of anatomy.zones) (zonesByStation[z.station] ??= []).push(z);

  for (const st of anatomy.order) {
    const zones = zonesByStation[st] ?? [];
    if (!zones.length) continue;

    for (const z of zones) {
      const box = indexMap.boxes?.[st]?.[z.id];
      if (!box) {
        console.log(`- ${st}/${z.id}: маски на домашней станции нет (квирк данных) — пропуск`);
        continue;
      }
      // Пустой выбор отлетает на «Обзор» после каждой зачистки — станцию
      // берём заново перед каждой зоной
      await p.getByRole("button", { name: chipLabel(st), exact: true }).first().click();
      await waitStation(p, chipLabel(st));
      await p.waitForTimeout(500);

      // 1) Тап по зоне в ДЕФОЛТНОМ окне станции — главный пользовательский вход
      let fr = await frame.boundingBox();
      let wr = await wrap.boundingBox();
      const viewLo = (wr.x - fr.x) / fr.width + 0.01;
      const viewHi = (wr.x + wr.width - fr.x) / fr.width - 0.01;
      const zoneNumber = indexMap.stations[st].indexOf(z.id) + 1;
      const pt = await insidePoint(st, zoneNumber, viewLo, viewHi);
      let selectedByTap = false;
      if (!pt || pt[2] < 4) {
        console.log(`- ${st}/${z.id}: в дефолтном окне нет надёжного ядра — вход через чип`);
      } else {
        await p.touchscreen.tap(fr.x + pt[0] * fr.width, fr.y + pt[1] * fr.height);
        await p.waitForTimeout(600);
        const sheetOpen = await p.locator('.ds-anatomy-sheet[data-open="true"]').count();
        const sheetLabel = sheetOpen ? await p.locator(".ds-anatomy-sheet p").first().innerText() : "";
        ok(sheetOpen === 1 && sheetLabel === z.label, `${st}/${z.id}: тап открыл шит («${sheetLabel || "нет"}»)`);
        selectedByTap = sheetOpen === 1 && sheetLabel === z.label;
        if (selectedByTap) {
          const ctaOpacity = await p.evaluate(() => {
            const panel = document.querySelector(".shadow-sticky");
            return panel ? getComputedStyle(panel).opacity : "нет панели";
          });
          ok(ctaOpacity === "0" || ctaOpacity === "нет панели", `${st}/${z.id}: CTA-панель спрятана (opacity ${ctaOpacity})`);
        }
      }

      // 2) Чип: если тап не прошёл/пропущен — выбор через чип; иначе чип
      // обязан отражать выбранность
      const chip = p.locator(`li[data-station="${st}"] button`, { hasText: new RegExp(`^${z.label}$`) }).first();
      if (!selectedByTap) {
        await p.locator(".ds-anatomy-sheet button[aria-label='Закрыть карточку зоны']").click().catch(() => {});
        if ((await chip.getAttribute("aria-pressed")) === "true") await chip.click().catch(() => {});
        await p.waitForTimeout(300);
        await p.getByRole("button", { name: chipLabel(st), exact: true }).first().click().catch(() => {});
        await waitStation(p, chipLabel(st));
        await chip.click();
        await p.waitForTimeout(700);
        const sheetOpen = await p.locator('.ds-anatomy-sheet[data-open="true"]').count();
        ok(sheetOpen === 1, `${st}/${z.id}: чип открыл шит`);
      } else {
        ok((await chip.getAttribute("aria-pressed")) === "true", `${st}/${z.id}: чип отражает выбор`);
      }

      // 3) Тапабельность: экранный bbox после авто-пана к зоне
      fr = await frame.boundingBox();
      wr = await wrap.boundingBox();
      const sx = (vv) => fr.x + vv * fr.width;
      const sy = (vv) => fr.y + vv * fr.height;
      const x0 = Math.max(sx(box[0]), wr.x);
      const x1 = Math.min(sx(box[2]), wr.x + wr.width);
      const y0 = Math.max(sy(box[1]), wr.y);
      const y1 = Math.min(sy(box[3]), wr.y + wr.height);
      const w = x1 - x0;
      const h = y1 - y0;
      const passSize = Math.min(w, h) >= 44 || (Math.max(w, h) >= 88 && Math.min(w, h) >= 28);
      ok(passSize, `${st}/${z.id}: экранный bbox ${w.toFixed(0)}×${h.toFixed(0)}px`);

      // 4) Зачистка: шит закрыть, выбор снять; пустой выбор отлетает на
      // «Обзор» — дожидаемся, иначе следующий шаг стреляет в полёт
      await p.locator(".ds-anatomy-sheet button[aria-label='Закрыть карточку зоны']").click().catch(() => {});
      if ((await chip.getAttribute("aria-pressed")) === "true") {
        await chip.click();
        await waitStation(p, chipLabel(S0));
        await p.waitForTimeout(300);
      }
    }
  }

  // 3: режим 360° (§3.2) — каскад не стартует без жеста, драг вращает со
  // снапом, тап по зоне на ненулевом кадре докручивает к 0 и улетает на станцию
  await p.getByRole("button", { name: chipLabel(S0), exact: true }).click();
  await p.waitForTimeout(4600);
  await sec.scrollIntoViewIfNeeded();
  await p.waitForTimeout(400);

  const spinReq = [];
  p.on("request", (r) => {
    if (r.url().includes("/anatomy/spin/")) spinReq.push(r.url());
  });
  await p.waitForTimeout(600);
  ok(spinReq.length === 0, `каскад спина не стартует без pointerdown (запросов: ${spinReq.length})`);

  const wr = await wrap.boundingBox();
  const scrollBefore = await p.evaluate(() => window.scrollY);
  const cy = wr.y + wr.height / 2;
  await p.mouse.move(wr.x + wr.width * 0.8, cy);
  await p.mouse.down();
  let scrubSeen = false;
  for (let i = 1; i <= 12; i++) {
    await p.mouse.move(wr.x + wr.width * 0.8 - (i / 12) * wr.width * 0.55, cy);
    if (i === 8) scrubSeen = (await p.locator('.ds-anatomy-scrub[data-on="true"]').count()) === 1;
    await p.waitForTimeout(30);
  }
  await p.mouse.up();
  await p.waitForTimeout(700);
  const bg = await p.locator(".ds-anatomy-scrub").evaluate((el) => el.style.backgroundImage);
  const frameMatch = bg.match(/beauty_(\d+)\.webp/);
  ok(scrubSeen, "во время драга показывается слой спина");
  ok(Boolean(frameMatch) && Number(frameMatch[1]) !== 0, `драг повернул машину (кадр ${frameMatch?.[1] ?? "?"})`);
  ok(spinReq.length > 0, `лестница загрузки пошла после жеста (${spinReq.length} запросов)`);
  const scrollAfterH = await p.evaluate(() => window.scrollY);
  ok(scrollBefore === scrollAfterH, "горизонтальный драг не скроллит страницу");
  ok((await p.locator(".ds-anatomy-hint").count()) === 0, "хинт вращения исчез после первого драга");
  const sheetAfterPan = await p.locator('.ds-anatomy-sheet[data-open="true"]').count();
  ok(sheetAfterPan === 0, "ghost-click после вращения подавлен");

  // вертикальный свайп по повёрнутому кадру остаётся скроллом страницы
  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Input.synthesizeScrollGesture", {
    x: Math.round(wr.x + wr.width / 2),
    y: Math.round(cy),
    yDistance: -240,
    speed: 900,
  });
  await p.waitForTimeout(600);
  const scrollAfterV = await p.evaluate(() => window.scrollY);
  ok(scrollAfterV > scrollBefore, `вертикальный свайп скроллит страницу (${scrollBefore} → ${scrollAfterV})`);
  await p.evaluate((yy) => window.scrollTo(0, yy), scrollBefore);
  await p.waitForTimeout(400);

  // тап по зоне на ненулевом кадре спина → докрутка к 0 → полёт на станцию
  if (anatomy.spin && frameMatch && Number(frameMatch[1]) !== 0) {
    const fi = Number(frameMatch[1]);
    const zonesFile = `public/anatomy/${(anatomy.spin.zonesPattern ?? anatomy.spin.zones ?? "spin/zones_{nn}.png").replace(/\{i:02d\}|\{nn\}/, String(fi).padStart(2, "0"))}`;
    const targetZone = anatomy.zones.find((z) => z.id === "hood") ?? anatomy.zones[0];
    // Матчер зоны: палитра из index_map.json (пайплайн v1.3) либо R-индекс
    let match = null;
    const palHex = indexMap.spin?.palette?.[targetZone.id];
    if (palHex) {
      const h = palHex.replace("#", "");
      match = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    } else if (!anatomy.spin.palette) {
      const spinOrder = anatomy.spin.order ?? anatomy.zones.map((z) => z.id);
      match = spinOrder.indexOf(targetZone.id) + 1;
    }
    const fr2 = await frame.boundingBox();
    const wrp = await wrap.boundingBox();
    const lo = (wrp.x - fr2.x) / fr2.width + 0.01;
    const hi = (wrp.x + wrp.width - fr2.x) / fr2.width - 0.01;
    const pt = match ? await insidePointFile(zonesFile, match, lo, hi) : null;
    if (!pt || pt[2] < 3) {
      console.log(`- спин: у «${targetZone.id}» нет надёжного ядра на кадре ${fi} — тап-тест пропущен`);
    } else {
      await p.touchscreen.tap(fr2.x + pt[0] * fr2.width, fr2.y + pt[1] * fr2.height);
      await p.waitForTimeout(1100); // докрутка ≤0.8с
      ok((await p.locator('.ds-anatomy-scrub[data-on="true"]').count()) === 0, "выбор из спина докрутил машину до кадра 0");
      const landed = await waitStation(p, chipLabel(targetZone.station), 12000);
      ok(landed, `из спина улетели на «${anatomy.stations[targetZone.station].label}»`);
      await p.waitForTimeout(600);
      const sheetOpen = await p.locator('.ds-anatomy-sheet[data-open="true"]').count();
      const lbl = sheetOpen ? await p.locator(".ds-anatomy-sheet p").first().innerText() : "";
      ok(sheetOpen === 1 && lbl === targetZone.label, `шит зоны из спина: «${lbl || "нет"}»`);
      // зачистка выбора: пустой выбор отлетает на обзор
      await p.locator(".ds-anatomy-sheet button[aria-label='Закрыть карточку зоны']").click().catch(() => {});
      const spunChip = p
        .locator(`li[data-station="${targetZone.station}"] button`, { hasText: new RegExp(`^${targetZone.label}$`) })
        .first();
      if ((await spunChip.getAttribute("aria-pressed")) === "true") {
        await spunChip.click();
        await waitStation(p, chipLabel(S0));
        await p.waitForTimeout(300);
      }
    }
  } else if (!anatomy.spin) {
    console.log("- спин: секции spin в anatomy.json нет — тесты §3.2 пропущены");
  }

  // 4: перелёт к соседней станции в кропе — кадры не пустые
  await p.getByRole("button", { name: "Капот", exact: true }).first().click();
  await waitStation(p, "Капот");
  await p.waitForTimeout(600);
  const flightShots = [];
  const clickPromise = p.getByRole("button", { name: "Оптика и фронт", exact: true }).click();
  for (const t of [500, 1000, 1500]) {
    await p.waitForTimeout(t === 500 ? 500 : 500);
    flightShots.push(await wrap.screenshot());
  }
  await clickPromise;
  await waitStation(p, "Оптика и фронт");
  for (let i = 0; i < flightShots.length; i++) {
    // «не пустой» = в PNG есть заметный разброс байтов (машина/блики в кадре)
    const bytes = flightShots[i];
    ok(bytes.length > 8000, `кадр полёта ${(i + 1) * 25}%: скриншот ${(bytes.length / 1024).toFixed(0)} КБ (не пустой)`);
  }

  // 5: дальняя станция отвечает сразу — кроссфейд, а не цепочка клипов
  // (владелец 04.09: тап по корме держал 4,4 с). Прямой клип из пакета,
  // если вписан в anatomy-direct-flights.json, тоже обязан уложиться в 2,5 с.
  {
    const clipsBefore = [];
    const onReq = (r) => { if (r.url().includes("/anatomy/flight_")) clipsBefore.push(r.url().split("/").pop()); };
    p.on("request", onReq);
    const t0 = Date.now();
    await p.getByRole("button", { name: "Корма", exact: true }).click();
    const landed = await waitStation(p, "Корма", 2500);
    const ms = Date.now() - t0;
    p.off("request", onReq);
    const direct = directFlights.includes("S2_S5");
    ok(landed && ms <= (direct ? 2500 : 900), `дальняя станция: «Корма» за ${ms} мс (${direct ? "прямой клип" : "кроссфейд, лимит 900"})`);
    ok(direct ? clipsBefore.length === 1 : clipsBefore.length === 0, `дальняя станция: клипов запрошено ${clipsBefore.length} (${direct ? "ровно один прямой" : "ни одного — цепочки больше нет"})`);
    await p.waitForTimeout(400);
  }

  await ctx.close();
}

/* ── Десктоп ── */
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.route("**mc.yandex.ru**", (r) => r.abort());
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  const sec = p.locator('[data-gate-new*="Анатомия"]');
  const clipsAtStart = [];
  p.on("request", (r) => { if (r.url().includes("/anatomy/flight_")) clipsAtStart.push(r.url()); });
  await sec.scrollIntoViewIfNeeded();

  // Приветственный оборот (владелец 04.09): на первом показе блока машина
  // сама делает круг из кадров спина и встаёт на обзор. Без клипов.
  if (anatomy.spin) {
    let spinning = false;
    for (let i = 0; i < 40; i++) {
      await p.waitForTimeout(150);
      if ((await p.locator('.ds-anatomy-scrub[data-on="true"]').count()) === 1) { spinning = true; break; }
    }
    ok(spinning, "десктоп: приветственный оборот начался в первые 6 с показа");
    let settled = false;
    for (let i = 0; i < 100; i++) {
      await p.waitForTimeout(150);
      if ((await p.locator('.ds-anatomy-scrub[data-on="true"]').count()) === 0) { settled = true; break; }
    }
    const chip = await p.locator("div.mb-4 button.border-accent").innerText().catch(() => "");
    ok(settled && chip === chipLabel(S0), `десктоп: оборот закончился на обзоре (активный чип «${chip}»)`);
    ok(clipsAtStart.length === 0, `десктоп: оборот не тянул клипов пролёта (запрошено ${clipsAtStart.length})`);
    await p.waitForTimeout(400);
  } else {
    await p.waitForTimeout(2200);
  }

  // frame на десктопе нейтрален
  const frameW = await p.locator(".ds-anatomy-frame").evaluate((el) => el.getBoundingClientRect().width);
  const wrapW = await p.locator(".ds-anatomy-crop").evaluate((el) => el.getBoundingClientRect().width);
  ok(Math.abs(frameW - wrapW) <= 3, `десктоп: frame = контейнеру (${frameW.toFixed(0)} vs ${wrapW.toFixed(0)})`);

  // тултип у курсора при наведении на капот (S0: зона hood в кадре)
  const wrap = await p.locator(".ds-anatomy-crop").boundingBox();
  await p.mouse.move(wrap.x + wrap.width * 0.45, wrap.y + wrap.height * 0.45, { steps: 5 });
  await p.waitForTimeout(400);
  const tipVisible = await p.locator(".ds-anatomy-tip:not([hidden])").count();
  const tipText = tipVisible ? await p.locator(".ds-anatomy-tip").innerText() : "";
  ok(tipVisible === 1 && tipText.length > 0, `тултип у курсора: «${tipText || "нет"}»`);

  await ctx.close();
}

await b.close();
console.log(failures ? `\n✗ Провалов: ${failures}` : "\n✓ Анатомия: все проверки зелёные");
process.exit(failures ? 1 : 0);
