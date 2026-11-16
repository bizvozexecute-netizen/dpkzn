/**
 * Добор недоставленных уведомлений о заявках.
 *
 * Запуск (крон на проде, раз в 5 минут):
 *   cd /var/www/dpkzn && node scripts/telegram-retry.mjs >> /var/log/dpkzn-tg-retry.log 2>&1
 *
 * Зачем: с этого VPS у api.telegram.org отвечает РОВНО ОДИН адрес
 * (149.154.167.220, закреплён в /etc/hosts; остальной пул Telegram — таймаут,
 * проверено 03.09.2026). Если он моргнёт, заявка всё равно попадёт в журнал и
 * в CRM, но уведомление владелец не увидит. Этот скрипт добирает такие
 * заявки, когда канал вернулся: берёт из data/leads.db записи с сайта, у
 * которых tg_ok = 0, и шлёт заново.
 *
 * Идемпотентность: успешная отправка ставит tg_ok = 1, поэтому одна заявка
 * не уйдёт дважды. Записи старше суток не трогаем — уведомление о вчерашней
 * заявке уже бесполезно, она видна в /admin/leads.
 */

import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import path from "node:path";
import https from "node:https";

/** Сколько часов назад ещё имеет смысл дослать уведомление */
const MAX_AGE_H = 24;
/** Сколько заявок обрабатываем за один запуск (защита от лавины) */
const BATCH = 20;

/* ── Конфиг: .env.local читаем сами, скрипт запускается вне Next ─────────── */
function readEnv() {
  const env = {};
  try {
    for (const line of readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    /* нет файла — работаем на переменных окружения */
  }
  return { ...env, ...process.env };
}

const env = readEnv();
const TOKEN = env.TG_BOT_TOKEN;
const CHAT = env.TG_CHAT_ID;
if (!TOKEN || !CHAT) {
  console.log(`[${new Date().toISOString()}] TG_BOT_TOKEN/TG_CHAT_ID не заданы — выход`);
  process.exit(0);
}

/**
 * Отправка тем же транспортом, что и в src/lib/telegram.ts: node:https с
 * family 4. undici/fetch с этого хоста к Telegram виснет всегда — проверено
 * 6/6, менять транспорт нельзя.
 */
function send(text) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ chat_id: CHAT, text, disable_web_page_preview: true });
    const req = https.request(
      {
        host: "api.telegram.org",
        port: 443,
        path: `/bot${TOKEN}/sendMessage`,
        method: "POST",
        family: 4,
        timeout: 10000,
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ ok: res.statusCode === 200, status: res.statusCode, body: body.slice(0, 200) }));
      },
    );
    req.on("error", (e) => resolve({ ok: false, status: 0, body: String(e.message) }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, status: 0, body: "timeout" });
    });
    req.write(payload);
    req.end();
  });
}

/** Текст 1:1 с /api/submit — владелец видит привычный формат */
function buildText(r) {
  const services = r.services_json ? JSON.parse(r.services_json) : [];
  const utm = [r.utm_source, r.utm_medium, r.utm_campaign];
  return [
    "📋 Новая заявка с сайта (дослано)",
    `📱 Телефон: ${r.phone ?? "—"}`,
    r.name ? `👤 Имя: ${r.name}` : "",
    r.car_class ? `🚗 Класс: ${r.car_class}` : "",
    r.car_brand ? `🚗 Марка: ${r.car_brand}` : "",
    r.service ? `🔧 Услуга: ${r.service}` : "",
    services.length ? `🔧 Услуги: ${services.join(", ")}` : "",
    r.urgency ? `⏰ Срочность: ${r.urgency}` : "",
    r.channel ? `💬 Канал: ${r.channel}` : "",
    r.source ? `📍 Источник: ${r.source}` : "",
    r.page ? `📄 Страница: ${r.page}` : "",
    ...(r.photos_json ? JSON.parse(r.photos_json) : []).map((photo, i) => `📷 Фото ${i + 1} (вход для студии): https://dpkzn.ru${photo.url}`),
    utm.some(Boolean) ? `📊 UTM: ${utm.map((v) => v || "—").join(" / ")}` : "",
    r.utm_content ? `🎯 Креатив: ${r.utm_content}` : "",
    r.utm_term ? `🔑 Запрос: ${r.utm_term}` : "",
    r.yclid ? `🆔 yclid: ${r.yclid}` : "",
    `🕒 Пришла: ${new Date(r.created_at).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const db = new Database(path.join(process.cwd(), "data", "leads.db"));
db.pragma("busy_timeout = 5000");

const since = new Date(Date.now() - MAX_AGE_H * 3600_000).toISOString();
// NULL means the initial attempt has not finished (or the process stopped).
// Give it two minutes before retrying to avoid racing an in-flight request.
const pendingBefore = new Date(Date.now() - 120_000).toISOString();
const rows = db
  .prepare(
    `SELECT * FROM leads
      WHERE origin = 'site' AND (tg_ok = 0 OR (tg_ok IS NULL AND created_at < ?)) AND created_at >= ?
      ORDER BY id ASC LIMIT ?`,
  )
  .all(pendingBefore, since, BATCH);

if (rows.length === 0) {
  process.exit(0); // тишина в кроне: писать «нечего слать» каждые 5 минут незачем
}

const stamp = new Date().toISOString();
console.log(`[${stamp}] недоставленных за ${MAX_AGE_H} ч: ${rows.length}`);

const markSent = db.prepare("UPDATE leads SET tg_ok = 1, updated_at = ? WHERE id = ?");
let sent = 0;
for (const row of rows) {
  const res = await send(buildText(row));
  if (res.ok) {
    markSent.run(new Date().toISOString(), row.id);
    sent++;
    console.log(`[${stamp}] заявка #${row.id} доставлена`);
  } else {
    console.log(`[${stamp}] заявка #${row.id} снова не ушла: ${res.status} ${res.body}`);
    break; // канал всё ещё лежит — не долбим, дождёмся следующего запуска
  }
}
console.log(`[${stamp}] дослано: ${sent} из ${rows.length}`);
