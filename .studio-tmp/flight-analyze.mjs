// Разбор RSC flight-данных в HTML: какие строки занимают больше всего места.
import { readFileSync } from "node:fs";
const html = readFileSync(process.argv[2], "utf8");
const pushes = [...html.matchAll(/<script>self\.__next_f\.push\(([\s\S]*?)\)<\/script>/g)].map((m) => m[1]);
let flight = "";
for (const p of pushes) {
  try { const a = JSON.parse(p); if (typeof a[1] === "string") flight += a[1]; } catch {}
}
console.log("html", html.length, "flight", flight.length);
const rows = flight.split(/\n(?=[0-9a-f]+:)/);
const sized = rows.map((r) => [r.length, r.slice(0, 140).replace(/\s+/g, " ")]).sort((a, b) => b[0] - a[0]);
for (const [n, s] of sized.slice(0, 12)) console.log(String(n).padStart(6), s);
for (const k of process.argv.slice(3)) console.log("count", k, flight.split(k).length - 1);
