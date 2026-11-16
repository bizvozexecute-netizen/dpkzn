/**
 * Пережимает сгенерированный ролик в пару webm+mp4 для hero-видео на сайте.
 *
 * Запуск:  node scripts/encode-hero-video.mjs <вход.mp4> <имя>
 * Пример:  node scripts/encode-hero-video.mjs C:/tmp/raw-home.mp4 home
 * Выход:   public/video/hero/<имя>.webm  +  public/video/hero/<имя>.mp4
 *
 * Целевой бюджет: webm ≤1.5 МБ, mp4 ≤2.5 МБ при 1280×720 без звука —
 * ролик лежит под тёмным оверлеем сайта, поэтому 720p достаточно, а вес
 * критичен: 80% трафика мобильный. Звук вырезается (hero играет в muted).
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import ffmpeg from "ffmpeg-static";

const [input, name] = process.argv.slice(2);
if (!input || !name) {
  console.error("Использование: node scripts/encode-hero-video.mjs <вход.mp4> <имя>");
  process.exit(1);
}

const OUT_DIR = "public/video/hero"; // каталог сайта — video/, не videos/
mkdirSync(OUT_DIR, { recursive: true });

const webm = path.join(OUT_DIR, `${name}.webm`);
const mp4 = path.join(OUT_DIR, `${name}.mp4`);
const scale = "scale=1280:-2";

const run = (args) => execFileSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });

console.log("VP9 (webm)...");
run(["-i", input, "-vf", scale, "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-row-mt", "1", webm]);

console.log("H.264 (mp4, фолбэк для Safari)...");
run(["-i", input, "-vf", scale, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);

for (const f of [webm, mp4]) {
  const mb = statSync(f).size / 1048576;
  const cap = f.endsWith(".webm") ? 1.5 : 2.5;
  console.log(`${f}: ${mb.toFixed(2)} МБ ${mb <= cap ? "✓" : `⚠ превышен лимит ${cap} МБ — поднять crf`}`);
}
