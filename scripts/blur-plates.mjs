/**
 * Блюр автомобильных номеров на фото для внешних площадок (Авито, 2ГИС, Zoon).
 *
 * Запуск:  node scripts/blur-plates.mjs
 * Вход:    public/images/real works/  (оригиналы не изменяются)
 * Выход:   public/images/avito/       (готовые к загрузке файлы)
 *
 * Координаты регионов размечены вручную по каждому кадру (x, y, w, h в пикселях
 * ОРИГИНАЛА). Кадры без номеров в PLATES просто копируются с ресайзом.
 *
 * Как добавить новый кадр: открыть фото, прикинуть рамку номера с запасом,
 * дописать строку в PLATES. Регион гарантированно нечитаем: сначала downscale
 * до 12px по ширине, затем обратно + blur — восстановить текст невозможно.
 */

import sharp from "sharp";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const SRC_DIR = "public/images/real works";
const OUT_DIR = "public/images/avito";
/** Длинная сторона на выходе: Авито/2ГИС не показывают больше, а грузить с телефона легче. */
const MAX_SIDE = 2000;

/** file → [[x, y, w, h], ...] в координатах оригинала */
const PLATES = {
  "IMG_0941.JPG": [[2360, 1150, 600, 210]],
  "IMG_0942.JPG": [[2260, 1135, 580, 210]],
  "IMG_0943.JPG": [[2420, 720, 595, 215]],
  "IMG_0944.JPG": [[0, 1780, 300, 300]],
  "IMG_0945.JPG": [[0, 1660, 620, 310]],
  "IMG_3911.JPG": [[1530, 1050, 410, 175]],
  "IMG_4076.JPG": [[1140, 1110, 588, 250]],
  "IMG_4702.JPG": [[790, 1070, 550, 150]],
  "IMG_4714.JPG": [[760, 1250, 968, 1060]],
  "IMG_6322.JPG": [[1900, 1005, 570, 150]],
};

/** Кадры для подборки Авито — копируются даже без номеров. */
const CURATED = [
  "IMG_0941.JPG", "IMG_0942.JPG", "IMG_0943.JPG", "IMG_0944.JPG", "IMG_0945.JPG",
  "IMG_2793.JPG", "IMG_3049.JPG", "IMG_3830.JPG", "IMG_3856.JPG", "IMG_3885.JPG",
  "IMG_3911.JPG", "IMG_4076.JPG", "IMG_4371.JPG", "IMG_4387.JPG", "IMG_4402.JPG",
  "IMG_4450.JPG", "IMG_4690.JPG", "IMG_4702.JPG", "IMG_4714.JPG", "IMG_4972.JPG",
  "IMG_5122.JPG", "IMG_5123.JPG", "IMG_6322.JPG", "IMG_8627.JPG", "IMG_9041.JPG",
];

async function blurRegions(file, regions) {
  const src = path.join(SRC_DIR, file);
  const image = sharp(src);
  const { width, height } = await image.metadata();

  const overlays = [];
  for (const [x, y, w, h] of regions) {
    // Клипуем регион по границам кадра — защита от опечатки в координатах
    const left = Math.max(0, Math.min(x, width - 1));
    const top = Math.max(0, Math.min(y, height - 1));
    const rw = Math.min(w, width - left);
    const rh = Math.min(h, height - top);
    if (rw <= 0 || rh <= 0) continue;

    // 8px по ширине + blur, пропорциональный размеру региона: на крупных планах
    // (номер во весь кадр) слабая мозаика оставляет читаемые контуры цифр.
    const patch = await sharp(src)
      .extract({ left, top, width: rw, height: rh })
      .resize(8, Math.max(3, Math.round((8 * rh) / rw)), { fit: "fill" })
      .resize(rw, rh, { fit: "fill", kernel: "cubic" })
      .blur(Math.max(8, rw / 12))
      .toBuffer();

    overlays.push({ input: patch, left, top });
  }

  // ВАЖНО: composite и resize нельзя ставить в один pipeline — sharp применяет
  // resize РАНЬШЕ composite независимо от порядка вызовов, и накладки (в координатах
  // оригинала) легли бы мимо уже уменьшенного кадра. Поэтому два прохода:
  // сначала блюр в исходном разрешении, потом отдельным проходом ресайз.
  const composited = await image.composite(overlays).jpeg({ quality: 96 }).toBuffer();

  await sharp(composited)
    .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(OUT_DIR, file));

  return overlays.length;
}

async function copyResized(file) {
  await sharp(path.join(SRC_DIR, file))
    .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(OUT_DIR, file));
}

await mkdir(OUT_DIR, { recursive: true });
const available = new Set(await readdir(SRC_DIR));

let blurred = 0;
let copied = 0;
for (const file of CURATED) {
  if (!available.has(file)) {
    console.warn(`пропуск: ${file} — нет в ${SRC_DIR}`);
    continue;
  }
  if (PLATES[file]) {
    const n = await blurRegions(file, PLATES[file]);
    console.log(`${file}: заблюрено регионов — ${n}`);
    blurred++;
  } else {
    await copyResized(file);
    copied++;
  }
}

console.log(`\nГотово: ${blurred} с блюром, ${copied} скопировано → ${OUT_DIR}`);
