/**
 * Скачивает 7 hero-лупов (Higgsfield, ссылки из docs/redesign/content/hero-loops.md),
 * монтирует бесшовный луп кросс-фейдом хвоста на начало и пережимает под веб.
 *
 * Запуск:  node scripts/fetch-hero-loops.mjs [номер...]
 * Выход:   public/video/hero/loop-{n}.mp4 + .webm + постер loop-{n}.webp
 *
 * Спека из ТЗ: 720p, без звука, ≤2.5 МБ, autoplay muted loop playsinline + постер.
 */

import { execFileSync, execFileSync as run } from "node:child_process";
import { mkdirSync, existsSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ffmpeg from "ffmpeg-static";

const SOURCES = {
  1: "https://d8j0ntlcm91z4.cloudfront.net/user_3IUkRkDrVCW1wzAjyCyjes5laWS/hf_20260831_182209_c280a16f-749b-444c-b374-b3df6c0ae32a.mp4",
  2: "https://d8j0ntlcm91z4.cloudfront.net/user_3IUkRkDrVCW1wzAjyCyjes5laWS/hf_20260831_190159_d1464842-7179-4bd5-bf4f-abc8cbb78195.mp4",
  3: "https://d8j0ntlcm91z4.cloudfront.net/user_3IUkRkDrVCW1wzAjyCyjes5laWS/hf_20260831_183918_4d0b25f3-e48c-40f4-a254-4bf9cab85fe9.mp4",
  4: "https://d8j0ntlcm91z4.cloudfront.net/user_3IUkRkDrVCW1wzAjyCyjes5laWS/hf_20260831_190159_da5ac5fd-db2d-4828-8b2a-61537becc17a.mp4",
  5: "https://d8j0ntlcm91z4.cloudfront.net/user_3IUkRkDrVCW1wzAjyCyjes5laWS/hf_20260831_183918_772ce76d-76b9-4666-8639-5fe4836b1159.mp4",
  6: "https://d8j0ntlcm91z4.cloudfront.net/user_3IUkRkDrVCW1wzAjyCyjes5laWS/hf_20260831_190255_04c4b216-14df-4190-8460-6bdd35c93387.mp4",
  7: "https://d8j0ntlcm91z4.cloudfront.net/user_3IUkRkDrVCW1wzAjyCyjes5laWS/hf_20260831_183918_0542f70c-262b-406f-9159-f2fde36f8021.mp4",
};

const RAW_DIR = ".tmp/hero-loops";
const OUT_DIR = "public/video/hero";
const FADE = 0.5; // длина кросс-фейда шва, сек

const ff = (args) => run(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });

/** Длительность ролика: ffprobe в ffmpeg-static не поставляется — парсим баннер ffmpeg. */
function duration(file) {
  let out = "";
  try {
    execFileSync(ffmpeg, ["-hide_banner", "-i", file], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    out = String(e.stderr || "");
  }
  const m = out.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  if (!m) throw new Error(`не удалось прочитать длительность ${file}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

async function download(url, dest) {
  if (existsSync(dest)) return dest;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ссылка на луп протухла, нужна регенерация`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

async function main() {
  const wanted = process.argv.slice(2).map(Number).filter((n) => SOURCES[n]);
  const list = wanted.length ? wanted : Object.keys(SOURCES).map(Number);

  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  for (const n of list) {
    const raw = path.join(RAW_DIR, `raw-${n}.mp4`);
    const looped = path.join(RAW_DIR, `loop-${n}-src.mp4`);
    const mp4 = path.join(OUT_DIR, `loop-${n}.mp4`);
    const webm = path.join(OUT_DIR, `loop-${n}.webm`);
    const poster = path.join(OUT_DIR, `loop-${n}.webp`);

    console.log(`\n[${n}] скачиваю…`);
    await download(SOURCES[n], raw);

    const d = duration(raw);
    const shift = (d - FADE).toFixed(3);
    console.log(`[${n}] длительность ${d.toFixed(2)}с → шов кросс-фейдом ${FADE}с`);

    // Хвост длиной FADE проявляется поверх начала: точка склейки становится незаметной.
    const seam =
      `[0]split[body][pre];` +
      `[pre]trim=duration=${FADE},format=yuva420p,fade=d=${FADE}:alpha=1,setpts=PTS+${shift}/TB[head];` +
      `[body]trim=start=${FADE},setpts=PTS-STARTPTS[main];` +
      `[main][head]overlay,scale=1280:-2`;
    ff(["-i", raw, "-filter_complex", seam, "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", looped]);

    console.log(`[${n}] H.264…`);
    ff(["-i", looped, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
    console.log(`[${n}] VP9…`);
    ff(["-i", looped, "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-row-mt", "1", webm]);
    console.log(`[${n}] постер…`);
    ff(["-i", looped, "-frames:v", "1", "-c:v", "libwebp", "-quality", "80", poster]);

    for (const [f, cap] of [[mp4, 2.5], [webm, 1.5]]) {
      const mb = statSync(f).size / 1048576;
      console.log(`  ${f}: ${mb.toFixed(2)} МБ ${mb <= cap ? "✓" : `⚠ лимит ${cap} МБ — поднять crf`}`);
    }
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
