// Чанки из HTML-страницы: размер gzip и признаки модулей внутри.
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
const markers = ["CursorWheel", "cursor", "scroll_depth", "megamenu", "Мегаменю", "Footer", "CarPicker", "quiz", "PhoneField", "lucide", "createPortal", "IntersectionObserver", "reachGoal", "Lightbox", "Anatomy", "matchMedia"];
const html = readFileSync(process.argv[2], "utf8");
const chunks = [...new Set([...html.matchAll(/\/_next\/(static\/chunks\/[^"'\\ ]+?\.js)/g)].map((m) => m[1]))];
let total = 0;
for (const c of chunks) {
  const p = ".next/" + decodeURIComponent(c);
  if (!existsSync(p)) { console.log("missing", c); continue; }
  const src = readFileSync(p, "utf8");
  const gz = gzipSync(src).length; total += gz;
  console.log(String(gz).padStart(7), c.replace("static/chunks/", "").slice(0, 70), markers.filter((k) => src.includes(k)).join(","));
}
console.log("total gz", total);
