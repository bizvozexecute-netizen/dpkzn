/**
 * IndexNow ping — мгновенно сообщает Яндексу (и Bing) об изменённых URL
 * вместо ожидания планового переобхода.
 *
 * Запуск на сервере после деплоя:  npm run indexnow
 * Опционально можно передать конкретные URL:  node scripts/indexnow.mjs /polirovka /ceny
 * Без аргументов отправляет все URL из прод-sitemap.
 *
 * Ключ живёт в public/<KEY>.txt — файл и есть подтверждение владения доменом
 * (требование протокола). Раньше ключ был константой в коде, а файла на
 * проде не было: оба сервиса проверили keyLocation, получили 404 и запомнили
 * отказ — Яндекс отвечал «Invalid key», Bing «UserForbiddedToAccessSite»
 * даже после того, как файл появился (03–04.09.2026). Поэтому теперь ключ
 * читается из самого файла, а перед отправкой скрипт убеждается, что файл
 * отдаётся с прода: отправить ключ, который сервис не сможет проверить,
 * значит сжечь его навсегда.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "dpkzn.ru";
const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const ENDPOINTS = [
  "https://yandex.com/indexnow", // Яндекс
  "https://api.indexnow.org/indexnow", // Bing и остальные участники IndexNow
];

/** Файлы public/<hex>.txt, содержимое которых равно имени: это ключи IndexNow */
function localKeys() {
  return readdirSync(PUBLIC_DIR)
    .filter((f) => /^[a-f0-9]{8,128}\.txt$/i.test(f))
    .map((f) => ({ key: f.slice(0, -4), mtime: statSync(path.join(PUBLIC_DIR, f)).mtimeMs, body: readFileSync(path.join(PUBLIC_DIR, f), "utf8").trim() }))
    .filter((k) => k.body.toLowerCase() === k.key.toLowerCase())
    .sort((a, b) => b.mtime - a.mtime)
    .map((k) => k.key);
}

/** Ключ считается рабочим, только если прод отдаёт его файл с тем же содержимым */
async function pickKey() {
  const candidates = process.env.INDEXNOW_KEY ? [process.env.INDEXNOW_KEY] : localKeys();
  if (candidates.length === 0) {
    throw new Error(`в ${PUBLIC_DIR} нет файла ключа <hex>.txt — создайте его: node -e "const k=require('crypto').randomBytes(16).toString('hex');require('fs').writeFileSync('public/'+k+'.txt',k);console.log(k)"`);
  }
  const problems = [];
  for (const key of candidates) {
    const url = `https://${HOST}/${key}.txt`;
    try {
      const res = await fetch(url);
      const body = res.ok ? (await res.text()).trim() : "";
      if (res.ok && body.toLowerCase() === key.toLowerCase()) return key;
      problems.push(`${key}: ${res.ok ? `отдаётся «${body.slice(0, 20)}» вместо ключа` : `HTTP ${res.status}`}`);
    } catch (err) {
      problems.push(`${key}: ${err.message}`);
    }
  }
  throw new Error(`ни один ключ не подтверждается с прода:\n  ${problems.join("\n  ")}\nПоложите файл ключа в public/ на сервере и перезапустите приложение.`);
}

async function getUrls() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    return args.map((p) => (p.startsWith("http") ? p : `https://${HOST}${p.startsWith("/") ? p : `/${p}`}`));
  }
  const res = await fetch(`https://${HOST}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

// Код возврата ставится через exitCode, а не process.exit: на Windows
// принудительный выход при живых соединениях fetch роняет Node ошибкой libuv
let key;
let urlList;
try {
  key = await pickKey();
  urlList = await getUrls();
} catch (err) {
  // Стектрейс здесь бесполезен: это не сбой скрипта, а состояние окружения —
  // нет файла ключа, прод его не отдаёт, sitemap недоступен
  console.error(`IndexNow: не отправлено — ${err.message}`);
  process.exitCode = 1;
}

if (key && urlList) console.log(`IndexNow: ключ ${key} подтверждён с прода, отправляю ${urlList.length} URL...`);

let failed = 0;
for (const endpoint of key && urlList ? ENDPOINTS : []) {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList }),
    });
    if (res.ok || res.status === 202) {
      console.log(`${endpoint}: HTTP ${res.status} ✓`);
      continue;
    }
    failed++;
    const text = (await res.text()).replace(/\s+/g, " ").slice(0, 200);
    console.log(`${endpoint}: HTTP ${res.status} — ${text}`);
    if (res.status === 403) {
      console.log("  ↳ ключ отвергнут: сервис запомнил отказ, пока файл был недоступен. Сгенерируйте новый ключ,");
      console.log("    положите public/<новый>.txt на прод и повторите — старый ключ восстановить нельзя.");
    }
  } catch (err) {
    failed++;
    console.error(`${endpoint}: ${err.message}`);
  }
}
if (failed > 0 && failed === ENDPOINTS.length) process.exitCode = 1;
