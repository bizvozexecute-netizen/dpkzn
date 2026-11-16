// Сбор семантики из официального Yandex Wordstat API (Yandex Cloud Search API v2) по Казани.
// Креды из env: WORDSTAT_API_KEY, WORDSTAT_FOLDER_ID.
// Режимы:
//   node scripts/wordstat-collect.mjs --test   — connectivity-тест (регион + 1 запрос)
//   node scripts/wordstat-collect.mjs          — полный сбор -> docs/seo/wordstat-kazan.tsv
import fs from "node:fs";
import crypto from "node:crypto";

const API_KEY = process.env.WORDSTAT_API_KEY;
const FOLDER_ID = process.env.WORDSTAT_FOLDER_ID;
const BASE = "https://searchapi.api.cloud.yandex.net/v2/wordstat";
const CACHE_DIR = ".tmp_wordstat";

if (!API_KEY || !FOLDER_ID) {
  console.error("Нет WORDSTAT_API_KEY / WORDSTAT_FOLDER_ID в env");
  process.exit(1);
}
fs.mkdirSync(CACHE_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, body, { retries = 4 } = {}) {
  const url = `${BASE}/${path}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Api-Key ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folderId: FOLDER_ID, ...body }),
      });
    } catch (e) {
      if (attempt === retries) throw e;
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      const txt = await res.text();
      if (attempt === retries) throw new Error(`${res.status}: ${txt}`);
      await sleep(1500 * (attempt + 1));
      continue;
    }
    const txt = await res.text();
    if (!res.ok) throw new Error(`${res.status}: ${txt}`);
    return JSON.parse(txt);
  }
}

// Рекурсивный поиск id Казани в дереве регионов
function findKazan(node, acc = []) {
  if (!node) return acc;
  const arr = Array.isArray(node) ? node : [node];
  for (const n of arr) {
    const name = n.name || n.regionName || "";
    const id = n.id ?? n.regionId ?? n.geoId;
    if (/казан/i.test(name)) acc.push({ id: String(id), name });
    const kids = n.children || n.childrenList || n.regions || [];
    findKazan(kids, acc);
  }
  return acc;
}

async function resolveKazan() {
  try {
    const tree = await api("getRegionsTree", {});
    const root = tree.regionsTree || tree.tree || tree;
    const hits = findKazan(root);
    const city = hits.find((h) => /^казань$/i.test(h.name)) || hits[0];
    if (city) {
      console.error(`Регион резолвлен: ${city.name} = ${city.id}`);
      return city.id;
    }
  } catch (e) {
    console.error("getRegionsTree не сработал, fallback 43:", e.message);
  }
  return "43"; // стандартный id Казани
}

const SEEDS = [
  "детейлинг казань",
  "детейлинг кузова",
  "детейлинг салона",
  "выездной детейлинг казань",
  "антигравийная пленка казань",
  "бронепленка казань",
  "бронирование авто казань",
  "оклейка авто пленкой казань",
  "оклейка авто",
  "смена цвета авто пленкой",
  "полировка кузова казань",
  "полировка авто казань",
  "керамика на авто казань",
  "керамическое покрытие казань",
  "жидкое стекло авто казань",
  "защитное покрытие авто",
  "антикор казань",
  "антикоррозийная обработка казань",
  "химчистка салона казань",
  "химчистка авто казань",
  "шумоизоляция авто казань",
  "тонировка авто казань",
  "тонировка казань",
  "атермальная тонировка казань",
  "антихром казань",
  "установка би лед линз казань",
  "линзы в фары казань",
  "регулировка фар казань",
  "ремонт фар казань",
  "полировка фар казань",
  "полировка стекол казань",
  "антидождь казань",
  "ремонт вмятин без покраски казань",
  "удаление вмятин казань",
  "установка сигнализации казань",
  "автозапуск казань",
  "оклейка фар казань",
  "бронирование лобового стекла казань",
  "защита кузова авто казань",
  "полировка автомобиля",
];

async function topRequests(phrase, regionId) {
  const key = crypto.createHash("md5").update(`${regionId}:${phrase}`).digest("hex");
  const cacheFile = `${CACHE_DIR}/${key}.json`;
  if (fs.existsSync(cacheFile)) {
    return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  }
  const data = await api("topRequests", {
    phrase,
    numPhrases: 300,
    regions: [regionId],
    devices: ["DEVICE_ALL"],
  });
  fs.writeFileSync(cacheFile, JSON.stringify(data), "utf8");
  await sleep(400);
  return data;
}

function harvest(data, map) {
  // Только results (фразы с вхождением сида) — associations зашумлены
  // generic-запросами «X казань» (аэропорт/кафе/...), их не берём.
  const b = data.results;
  if (!Array.isArray(b)) return;
  for (const it of b) {
    const phrase = (it.phrase || "").trim();
    const count = Number(it.count || 0) || 0;
    if (!phrase) continue;
    const k = phrase.toLowerCase();
    // максимум по фразе (одна фраза может прийти из разных сидов)
    if (!map.has(k) || map.get(k).count < count) map.set(k, { phrase, count });
  }
}

async function main() {
  const test = process.argv.includes("--test");
  const regionId = await resolveKazan();

  if (test) {
    const d = await topRequests("детейлинг", regionId);
    console.error("totalCount:", d.totalCount);
    console.error("results:", (d.results || []).length, "associations:", (d.associations || []).length);
    console.error("Пример results:");
    for (const r of (d.results || []).slice(0, 12)) console.error(`  ${r.count}\t${r.phrase}`);
    console.error("Пример associations:");
    for (const r of (d.associations || []).slice(0, 8)) console.error(`  ${r.count}\t${r.phrase}`);
    return;
  }

  const map = new Map();
  let i = 0;
  for (const seed of SEEDS) {
    i++;
    try {
      const d = await topRequests(seed, regionId);
      harvest(d, map);
      console.error(`[${i}/${SEEDS.length}] ${seed} -> всего фраз: ${map.size}`);
    } catch (e) {
      console.error(`[${i}/${SEEDS.length}] ${seed} ОШИБКА: ${e.message}`);
    }
  }

  const list = [...map.values()].sort((a, b) => b.count - a.count);
  const out = ["phrase\tcount", ...list.map((x) => `${x.phrase}\t${x.count}`)];
  fs.mkdirSync("docs/seo", { recursive: true });
  fs.writeFileSync("docs/seo/wordstat-kazan.tsv", out.join("\n"), "utf8");
  console.error(`\nГотово: ${list.length} уникальных фраз -> docs/seo/wordstat-kazan.tsv`);
  console.error("ТОП-30:");
  for (const x of list.slice(0, 30)) console.error(`  ${x.count}\t${x.phrase}`);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
