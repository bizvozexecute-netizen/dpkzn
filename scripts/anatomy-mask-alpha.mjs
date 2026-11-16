/**
 * Маски зон → grayscale + alpha (альфа = яркость).
 *
 * Зачем. Пакет рендера отдаёт mask_*.png одноканальными, без прозрачности.
 * CSS mask-image по умолчанию (mask-mode: match-source) читает у изображения
 * АЛЬФУ, а она у таких файлов сплошная — маска перестаёт быть маской, и
 * подсветка заливает весь кадр. Спасает mask-mode: luminance, но в Safari
 * до 17.4 его нет, а -webkit-mask-source-type из WebKit удалён: на iPhone
 * зона золотила весь экран (владелец 03.09, iPhone 15 Pro Max).
 *
 * Что делает. Дописывает альфа-канал, равный яркости: белое остаётся зоной,
 * чёрное становится прозрачным. Оба режима CSS теперь дают один результат,
 * а гейт anatomy-verify, читающий яркость через .greyscale(), не меняется.
 *
 * Запуск: node scripts/anatomy-mask-alpha.mjs [--dry]
 * Идемпотентен: файл с альфой пропускается, поэтому можно гонять после
 * каждой распаковки пакета ассетов.
 */
import sharp from "sharp";
import { readdirSync, statSync, renameSync } from "node:fs";
import path from "node:path";

const DIR = "public/anatomy";
const dry = process.argv.includes("--dry");

const files = readdirSync(DIR).filter((f) => f.startsWith("mask_") && f.endsWith(".png"));
if (files.length === 0) {
  console.error("масок не найдено — запускать из корня проекта");
  process.exit(1);
}

let converted = 0;
let skipped = 0;
let before = 0;
let after = 0;

for (const f of files) {
  const src = path.join(DIR, f);
  const meta = await sharp(src).metadata();
  before += statSync(src).size;

  if (meta.hasAlpha) {
    skipped++;
    after += statSync(src).size;
    continue;
  }

  const { data, info } = await sharp(src).greyscale().raw().toBuffer({ resolveWithObject: true });
  const raw = { width: info.width, height: info.height, channels: 1 };

  if (dry) {
    converted++;
    after += statSync(src).size;
    continue;
  }

  const tmp = `${src}.tmp`;
  await sharp(data, { raw })
    .joinChannel(data, { raw })
    .png({ compressionLevel: 9, palette: false })
    .toFile(tmp);
  renameSync(tmp, src);
  converted++;
  after += statSync(src).size;
}

const kb = (n) => (n / 1024).toFixed(0) + " КБ";
console.log(
  `${dry ? "[dry] " : ""}маски: ${converted} с добавленной альфой, ${skipped} уже с альфой; вес ${kb(before)} → ${kb(after)}`,
);
