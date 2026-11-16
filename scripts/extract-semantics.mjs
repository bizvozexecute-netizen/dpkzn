// Разовый парсер выгрузки Яндекс.Директа (.xlsx) -> агрегированные поисковые запросы.
// xlsx уже распакован в .tmp_xlsx/ (sharedStrings.xml + worksheets/sheet1.xml).
// Запуск: node scripts/extract-semantics.mjs
import fs from "node:fs";

const SS = ".tmp_xlsx/xl/sharedStrings.xml";
const SHEET = ".tmp_xlsx/xl/worksheets/sheet1.xml";

/* ---------- 1. sharedStrings -> массив строк ---------- */
const ssXml = fs.readFileSync(SS, "utf8");
const strings = [];
const siRe = /<si>([\s\S]*?)<\/si>/g;
let m;
while ((m = siRe.exec(ssXml))) {
  const inner = m[1];
  // склеиваем все <t>...</t> внутри <si> (учёт <r> ранов)
  let text = "";
  const tRe = /<t[^>]*>([\s\S]*?)<\/t>|<t\/>/g;
  let tm;
  while ((tm = tRe.exec(inner))) text += tm[1] ?? "";
  strings.push(decode(text));
}
function decode(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
console.error(`sharedStrings: ${strings.length}`);

/* ---------- 2. колонка-буква -> индекс ---------- */
function colToIdx(col) {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/* ---------- 3. читаем строки листа ---------- */
const sheetXml = fs.readFileSync(SHEET, "utf8");
const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g;
const cellRe = /<c r="([A-Z]+)\d+"([^>]*)>(?:<v>([\s\S]*?)<\/v>)?<\/c>/g;

// Получаем значение ячейки как строку
function cellValue(attrs, raw) {
  if (raw == null) return "";
  if (/t="s"/.test(attrs)) return strings[parseInt(raw, 10)] ?? "";
  if (/t="str"/.test(attrs)) return decode(raw);
  return raw; // число
}

// Разбираем строку в map: colIdx -> value
function parseRow(inner) {
  const out = {};
  let c;
  cellRe.lastIndex = 0;
  while ((c = cellRe.exec(inner))) {
    out[colToIdx(c[1])] = cellValue(c[2], c[3]);
  }
  return out;
}

/* ---------- 4. находим заголовки ---------- */
let header = null;
let headerIdx = {}; // имя -> colIdx
const rows = [];
let r;
let count = 0;
while ((r = rowRe.exec(sheetXml))) {
  const row = parseRow(r[1]);
  count++;
  if (!header) {
    const vals = Object.values(row);
    if (vals.includes("Поисковый запрос")) {
      header = row;
      for (const [idx, name] of Object.entries(row)) headerIdx[name] = +idx;
      console.error("Заголовки найдены, колонок:", Object.keys(headerIdx).length);
    }
    continue;
  }
  rows.push(row);
}
console.error(`строк всего: ${count}, данных: ${rows.length}`);

const cQuery = headerIdx["Поисковый запрос"];
const cKeyphrase = headerIdx["Ключевая фраза"];
const cShows = headerIdx["Показы"];
const cClicks = headerIdx["Клики"];
// Конверсии: возможны разные названия
const cConv =
  headerIdx["Конверсии"] ??
  headerIdx["Конверсия"] ??
  headerIdx["Кол-во конверсий"];
console.error({ cQuery, cKeyphrase, cShows, cClicks, cConv });

/* ---------- 5. агрегируем по запросу ---------- */
const agg = new Map();
function num(v) {
  const n = parseFloat(String(v).replace(",", ".").replace(/\s/g, ""));
  return isNaN(n) ? 0 : n;
}
for (const row of rows) {
  let q = (row[cQuery] || "").trim();
  if (!q && cKeyphrase != null) q = (row[cKeyphrase] || "").trim();
  if (!q) continue;
  const key = q.toLowerCase();
  const cur = agg.get(key) || { query: q, shows: 0, clicks: 0, conv: 0 };
  cur.shows += num(row[cShows]);
  cur.clicks += num(row[cClicks]);
  if (cConv != null) cur.conv += num(row[cConv]);
  agg.set(key, cur);
}

const list = [...agg.values()].sort((a, b) => b.shows - a.shows);
console.error(`уникальных запросов: ${list.length}`);

/* ---------- 6. выгрузка ---------- */
const outLines = ["query\tshows\tclicks\tconv"];
for (const x of list)
  outLines.push(`${x.query}\t${x.shows}\t${x.clicks}\t${x.conv}`);
fs.writeFileSync(".tmp_xlsx/queries.tsv", outLines.join("\n"), "utf8");
console.error("записано .tmp_xlsx/queries.tsv");

// топ-80 в stderr для обзора
console.error("\n=== ТОП-80 по показам ===");
for (const x of list.slice(0, 80))
  console.error(`${x.shows}\t${x.clicks}\t${x.conv}\t${x.query}`);
