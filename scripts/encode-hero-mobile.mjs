/**
 * Мобильные ре-кадры hero-лупов: loop-N.mp4 → loop-N-m.{webm,mp4}, 4:5.
 *
 * Зачем. Hero на телефоне — 390×996 (соотношение 0.39), кадр лупа — 16:9
 * (1.79). Растянутый на весь hero кадр превращался в узкую центральную
 * полосу, объект уезжал за край: «видео почти не видно, оно в краях»
 * (владелец 03.09). Мобильный слой имеет соотношение 4:5, и клип для него
 * пере-кадрируется, а не обрезается экраном.
 *
 * Где кропить. Центр берётся по ДВИЖЕНИЮ, а не по яркости: в этих клипах
 * самое светлое — студийные лампы, они статичны, и центроид яркости уводил
 * кроп на засветку, срезая полировальник. Движется же именно объект, поэтому
 * берётся межкадровая разница (t=25% и t=75% клипа), её центроид по X и есть
 * центр действия. Итог ограничивается границами кадра.
 *
 * Запуск: node scripts/encode-hero-mobile.mjs [N ...]   (без аргументов — все)
 * Требует ffmpeg/ffprobe в PATH. Идемпотентен: готовые файлы пропускаются,
 * пере-генерация — с --force.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

const DIR = "public/video/hero";
const ASPECT = 4 / 5;
const OUT_W = 720;
const OUT_H = 900;

/** Ручной центр по X (доля ширины) там, где эвристика промахивается:
 *  loop-1 — полировальник в левой трети, движения в нём мало, а блики на
 *  капоте справа «тянут» центроид к лампе (проверено кадром 03.09). */
const CENTER_X = { 1: 0.34 };

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => /^\d+$/.test(a)).map(Number);

const run = (bin, argv) => execFileSync(bin, argv, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/** Центр действия по X (доля ширины): центроид межкадровой разницы */
async function motionCenterX(file, duration) {
  const tmp = mkdtempSync(path.join(tmpdir(), "hero-m-"));
  try {
    const grab = async (at, name) => {
      const f = path.join(tmp, name);
      run("ffmpeg", ["-y", "-v", "error", "-ss", String(at), "-i", file, "-vframes", "1", "-vf", "scale=192:-1", f]);
      return sharp(f).greyscale().raw().toBuffer({ resolveWithObject: true });
    };
    const [a, b] = await Promise.all([grab(duration * 0.25, "a.png"), grab(duration * 0.75, "b.png")]);
    const { info } = a;
    let sum = 0;
    let weight = 0;
    for (let i = 0; i < a.data.length; i++) {
      // Порог 8 гасит шум кодека; квадрат усиливает вклад реального движения
      const d = Math.abs(a.data[i] - b.data[i]);
      const w = d > 8 ? (d / 255) ** 2 : 0;
      sum += w * ((i % info.width) + 0.5);
      weight += w;
    }
    // Движения нет вовсе (статичный клип) — центр кадра
    return weight > 0 ? sum / weight / info.width : 0.5;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const loops = readdirSync(DIR)
  .filter((f) => /^loop-\d+\.mp4$/.test(f))
  .map((f) => Number(f.match(/\d+/)[0]))
  .filter((n) => (only.length ? only.includes(n) : true))
  .sort((a, b) => a - b);

for (const n of loops) {
  const src = path.join(DIR, `loop-${n}.mp4`);
  const outMp4 = path.join(DIR, `loop-${n}-m.mp4`);
  const outWebm = path.join(DIR, `loop-${n}-m.webm`);
  if (!force && existsSync(outMp4) && existsSync(outWebm)) {
    console.log(`loop-${n}: уже есть, пропуск`);
    continue;
  }

  const probe = JSON.parse(
    run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", src]),
  );
  const { width: W, height: H } = probe.streams[0];
  const duration = Number(probe.format.duration) || 5;

  // Кроп максимальной площади с нужным соотношением
  const cw = Math.min(W, Math.round(H * ASPECT));
  const ch = Math.round(cw / ASPECT);
  const cx = CENTER_X[n] ?? (await motionCenterX(src, duration));
  const x = Math.max(0, Math.min(W - cw, Math.round(cx * W - cw / 2)));
  const y = Math.max(0, Math.round((H - ch) / 2));

  const vf = `crop=${cw}:${ch}:${x}:${y},scale=${OUT_W}:${OUT_H}:flags=lanczos`;
  run("ffmpeg", ["-y", "-v", "error", "-i", src, "-an", "-vf", vf, "-c:v", "libx264", "-crf", "26", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", outMp4]);
  run("ffmpeg", ["-y", "-v", "error", "-i", src, "-an", "-vf", vf, "-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0", "-row-mt", "1", outWebm]);

  const kb = (f) => (statSync(f).size / 1024).toFixed(0) + " КБ";
  console.log(
    `loop-${n}: кроп ${cw}×${ch} @x=${x} (центр действия ${(cx * 100).toFixed(0)}% ширины) → ${OUT_W}×${OUT_H}; mp4 ${kb(outMp4)}, webm ${kb(outWebm)}`,
  );
}
