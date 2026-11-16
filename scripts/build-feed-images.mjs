#!/usr/bin/env node
/**
 * Готовит картинки для YML-фида Яндекс Бизнеса.
 *
 * Яндекс принимает в поле <picture> только JPG или PNG (webp не читает),
 * размер от 320×240 до 5000×5000, до 10 МБ. Сайт живёт на webp, поэтому
 * из public/images/hero/*.webp (по кадру на каждую услугу) собираем
 * JPG-копии в public/images/feed/.
 *
 * Запуск: node scripts/build-feed-images.mjs
 */

import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "public/images/hero";
const OUT = "public/images/feed";

/** Яндекс требует минимум 320×240; берём с запасом и не раздуваем вес. */
const MAX_SIDE = 1600;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;

async function main() {
  await mkdir(OUT, { recursive: true });

  const files = (await readdir(SRC)).filter((f) => f.endsWith(".webp"));
  if (files.length === 0) {
    console.error(`Нет .webp в ${SRC}`);
    process.exit(1);
  }

  let written = 0;
  const tooSmall = [];

  for (const file of files) {
    const src = path.join(SRC, file);
    const out = path.join(OUT, file.replace(/\.webp$/, ".jpg"));

    const img = sharp(src);
    const meta = await img.metadata();

    const resized = img
      .resize({
        width: MAX_SIDE,
        height: MAX_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, mozjpeg: true });

    const info = await resized.toFile(out);

    if (info.width < MIN_WIDTH || info.height < MIN_HEIGHT) {
      tooSmall.push(`${file} → ${info.width}×${info.height}`);
    }

    written++;
    console.log(
      `  ${file} (${meta.width}×${meta.height}) → ${path.basename(out)} ` +
        `(${info.width}×${info.height}, ${(info.size / 1024).toFixed(0)} КБ)`
    );
  }

  console.log(`\nГотово: ${written} JPG в ${OUT}`);

  if (tooSmall.length > 0) {
    console.warn(
      `\n⚠ Меньше минимума Яндекса ${MIN_WIDTH}×${MIN_HEIGHT} — фид их отклонит:\n  ` +
        tooSmall.join("\n  ")
    );
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
