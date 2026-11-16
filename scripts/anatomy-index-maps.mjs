/**
 * Собирает карты хитзон для «Анатомии детейлинга».
 *
 * Запуск: node scripts/anatomy-index-maps.mjs
 * Выход:  public/anatomy/index_{station}.png + index_map.json
 *
 * Почему не полигоны из контуров масок: зон на станции до 11, контуры рваные,
 * упрощение либо съедает узкие пороги, либо даёт сотни точек на зону. Одна
 * индексная картинка на станцию весит меньше набора полигонов, попадает
 * пиксель-в-пиксель и читается на клиенте одним getImageData.
 *
 * Индекс кладём в канал R, 0 — фон. Разрешение половинное: для попадания
 * пальцем и курсором этого достаточно, а вес падает вчетверо.
 */

import { existsSync, readdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR = "public/anatomy";
const SCALE = 0.5;
/** Зоны мельче порога (px индексного разрешения) в хит-тест не попадают:
 *  это вырожденные рёбра с профильных ракурсов (mask_S3_windshield — 122 px,
 *  кромка стекла с борта), по ним нельзя ни попасть, ни осмысленно навести.
 *  Чипы зон работают всегда — они не зависят от хит-карты. */
const MIN_ZONE_PX = 150;

const anatomy = JSON.parse(readFileSync(path.join(DIR, "anatomy.json"), "utf8"));
const stations = anatomy.order;

const files = new Set(readdirSync(DIR));
const indexMap = {};
// bbox и центроиды зон в долях кадра — питают авто-пан мобильного кропа.
// Центроид точнее центра bbox: у Г-образных и изогнутых зон (крыша с борта)
// масса лежит вбок от геометрического центра рамки.
const boxes = {};
const centers = {};
// Зоны, у которых на станции есть маска: подсветка шире хит-теста
const masksByStation = {};

for (const station of stations) {
  const prefix = `mask_${station}_`;
  const zones = [...files]
    .filter((f) => f.startsWith(prefix) && f.endsWith(".png"))
    .map((f) => f.slice(prefix.length, -4))
    .sort();

  if (zones.length === 0) continue;
  if (zones.length > 254) throw new Error(`${station}: зон больше 254, индекс не влезет в один канал`);

  const first = await sharp(path.join(DIR, `${prefix}${zones[0]}.png`)).metadata();
  const width = Math.round(first.width * SCALE);
  const height = Math.round(first.height * SCALE);
  const out = Buffer.alloc(width * height, 0);

  boxes[station] = {};
  centers[station] = {};
  const kept = [];
  const withMask = [];
  for (const zone of zones) {
    const { data } = await sharp(path.join(DIR, `${prefix}${zone}.png`))
      .resize(width, height, { kernel: "nearest" })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let count = 0;
    for (let p = 0; p < data.length; p++) if (data[p] > 127) count++;
    if (count === 0) continue;

    // Порог отсекает зону от ХИТ-ТЕСТА, но не от подсветки: маска в пакете
    // остаётся, выбранная зона обязана гореть на всех ракурсах, где видна
    // (§11). Поэтому bbox и центроид считаем для всех зон с маской, а номер
    // в индексную карту получают только прошедшие порог.
    const hittable = count >= MIN_ZONE_PX;
    if (!hittable) console.log(`  ${station}/${zone}: ${count} px < ${MIN_ZONE_PX} — вне хит-теста (чип и подсветка работают)`);
    withMask.push(zone);

    // Зоны не перекрываются, но на границах после ресайза бывает наложение —
    // побеждает та, что записана позже: разница в один пиксель по контуру.
    const index = hittable ? kept.push(zone) : 0;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    let sumX = 0, sumY = 0;
    for (let p = 0; p < out.length; p++) {
      if (data[p] > 127) {
        if (index) out[p] = index;
        const x = p % width, y = (p / width) | 0;
        sumX += x;
        sumY += y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX >= 0) {
      boxes[station][zone] = [minX / width, minY / height, (maxX + 1) / width, (maxY + 1) / height].map(
        (v) => Math.round(v * 1000) / 1000,
      );
      centers[station][zone] = [sumX / count / width, sumY / count / height].map((v) => Math.round(v * 1000) / 1000);
    }
  }
  masksByStation[station] = withMask;

  const file = path.join(DIR, `index_${station}.png`);
  await sharp(out, { raw: { width, height, channels: 1 } }).png({ colours: 256, compressionLevel: 9 }).toFile(file);

  indexMap[station] = kept;
  const kb = statSync(file).size / 1024;
  const extra = masksByStation[station].length - kept.length;
  const tail = extra ? ` (+${extra} только подсветка)` : "";
  console.log(`${station}: ${kept.length} зон в хит-тесте${tail} \u2192 ${path.basename(file)} ${kb.toFixed(1)} \u041a\u0411 (${width}\u00d7${height})`);
}

/* ── Палитра спина (§3.2) ──────────────────────────────────────────────────
   Первичный источник — zone_palette.json из самого пакета (с v1.4 он едет
   внутри архива); дальше — эталон в docs/redesign на случай старого пакета.
   Если словаря нет вовсе, соответствие «цвет зонной карты → зона»
   восстанавливается геометрией: кадр 0 орбиты == still_S0, каждому цвету
   spin/zones_00.png ищем маску mask_S0_* с максимальным перекрытием.
   Результат в любом случае кладём в index_map.json → компонент и
   верификатор читают палитру оттуда, не завися от формата рендера. */
const PALETTE_SOURCES = [path.join(DIR, "zone_palette.json"), "docs/redesign/zone_palette.json"];
const PALETTE_REF = PALETTE_SOURCES.find((f) => existsSync(f));
const spinCfg = anatomy.spin;
let spinPalette = null;
if (spinCfg && files.has("spin")) {
  const zonesFile = path.join(
    DIR,
    (spinCfg.zonesPattern ?? spinCfg.zones ?? "spin/zones_{nn}.png").replace(/\{i:02d\}|\{nn\}/, "00"),
  );
  const { data: zd, info } = await sharp(zonesFile).raw().toBuffer({ resolveWithObject: true });
  const { width: zw, height: zh, channels: zc } = info;

  // Пиксели каждого цвета (фон 0,0,0 пропускаем)
  const byColor = new Map();
  for (let p = 0; p < zd.length; p += zc) {
    const key = (zd[p] << 16) | (zd[p + 1] << 8) | zd[p + 2];
    if (!key) continue;
    let arr = byColor.get(key);
    if (!arr) byColor.set(key, (arr = []));
    arr.push(p / zc);
  }

  if (PALETTE_REF) {
    // Словарь рендера — первичный источник; кадром 0 только сверяемся
    const ref = JSON.parse(readFileSync(PALETTE_REF, "utf8"));
    spinPalette = {};
    for (const [zone, [r, g, b]] of Object.entries(ref)) {
      const key = (r << 16) | (g << 8) | b;
      spinPalette[zone] = `#${key.toString(16).padStart(6, "0").toUpperCase()}`;
      if (!byColor.has(key)) console.log(`  спин: зоны ${zone} (${spinPalette[zone]}) нет на кадре 0 — перекрыта ракурсом?`);
    }
    const known = new Set(Object.values(spinPalette));
    for (const key of byColor.keys()) {
      const hex = `#${key.toString(16).padStart(6, "0").toUpperCase()}`;
      if (!known.has(hex)) throw new Error(`спин: цвет ${hex} кадра 0 отсутствует в эталоне ${PALETTE_REF}`);
    }
    console.log(`спин: палитра из эталона ${PALETTE_REF} — ${Object.keys(spinPalette).length} зон, сверка с кадром 0 чиста`);
  } else {
    // Фолбэк: геометрический матчинг цветов с масками S0
    const s0zones = [...files].filter((f) => f.startsWith("mask_S0_") && f.endsWith(".png")).map((f) => f.slice(8, -4));
    const s0masks = new Map();
    for (const zone of s0zones) {
      const { data } = await sharp(path.join(DIR, `mask_S0_${zone}.png`))
        .resize(zw, zh, { kernel: "nearest" })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });
      s0masks.set(zone, data);
    }

    spinPalette = {};
    for (const [key, px] of byColor) {
      let bestZone = null;
      let bestHit = 0;
      for (const [zone, mask] of s0masks) {
        let hit = 0;
        for (const i of px) if (mask[i] > 127) hit++;
        if (hit > bestHit) {
          bestHit = hit;
          bestZone = zone;
        }
      }
      const hex = `#${key.toString(16).padStart(6, "0").toUpperCase()}`;
      const share = ((bestHit / px.length) * 100).toFixed(0);
      if (!bestZone || bestHit / px.length < 0.5) {
        console.log(`  спин: цвет ${hex} (${px.length} px) не сматчился с масками S0 (${share}%) — пропуск`);
        continue;
      }
      if (Object.values(spinPalette).includes(hex)) throw new Error(`спин: цвет ${hex} назначен дважды`);
      if (spinPalette[bestZone]) throw new Error(`спин: зона ${bestZone} получила два цвета`);
      spinPalette[bestZone] = hex;
      console.log(`  спин: ${hex} → ${bestZone} (перекрытие ${share}%, ${px.length} px)`);
    }
    console.log(`спин: эталона нет — палитра геометрией, ${Object.keys(spinPalette).length} зон (цветов в карте: ${byColor.size})`);
  }
}

writeFileSync(
  path.join(DIR, "index_map.json"),
  JSON.stringify(
    {
      scale: SCALE,
      stations: indexMap,
      masks: masksByStation,
      boxes,
      centers,
      ...(spinPalette ? { spin: { frames: spinCfg.count ?? spinCfg.frames ?? 48, palette: spinPalette } } : {}),
    },
    null,
    2,
  ) + "\n",
);
console.log("index_map.json записан");
