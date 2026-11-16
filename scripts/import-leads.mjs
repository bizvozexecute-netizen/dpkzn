/**
 * Импорт заявок в микро-CRM (data/leads.db). Идемпотентен: повторный запуск
 * не создаёт дублей (dedupe_key UNIQUE + INSERT OR IGNORE).
 *
 * Запуск:
 *   node scripts/import-leads.mjs                       — data/leads.jsonl → CRM
 *   node scripts/import-leads.mjs --webvisor file.csv   — кандидаты из Метрики
 *
 * Формат CSV вебвизора (разделитель «;», без кавычек, первая строка — заголовок):
 *   visitDateTime;clientID;goal;page;phoneTail;durationSec;device
 * Строки получают status=needs_phone: номер владелец достаёт из записи
 * вебвизора и вписывает в /admin/leads.
 *
 * DDL продублирован из src/lib/db/leads-schema.ts (LEADS_DDL) — менять парой!
 */

import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const DDL = `
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  origin TEXT NOT NULL DEFAULT 'site',
  phone TEXT,
  name TEXT,
  car_class TEXT,
  car_brand TEXT,
  service TEXT,
  services_json TEXT,
  photos_json TEXT,
  urgency TEXT,
  channel TEXT,
  source TEXT,
  page TEXT,
  client_timestamp TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  yclid TEXT,
  vk_aid TEXT,
  rb_clickid TEXT,
  attribution_json TEXT,
  tg_ok INTEGER,
  crm_ok INTEGER,
  visit_date_time TEXT,
  goal TEXT,
  client_id TEXT,
  phone_tail TEXT,
  webvisor_hint TEXT,
  manager_note TEXT,
  dedupe_key TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
`;

const dataDir = path.join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "leads.db"));
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
db.exec(DDL);
if (!db.prepare("PRAGMA table_info(leads)").all().some(c => c.name === "photos_json")) db.exec("ALTER TABLE leads ADD COLUMN photos_json TEXT");

const insert = db.prepare(`
  INSERT OR IGNORE INTO leads (
    created_at, updated_at, status, origin, phone, name, car_class, car_brand,
    service, services_json, photos_json, urgency, channel, source, page, client_timestamp,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, yclid, vk_aid,
    rb_clickid, attribution_json, tg_ok, crm_ok, visit_date_time, goal,
    client_id, phone_tail, webvisor_hint, dedupe_key
  ) VALUES (
    @created_at, @updated_at, @status, @origin, @phone, @name, @car_class, @car_brand,
    @service, @services_json, @photos_json, @urgency, @channel, @source, @page, @client_timestamp,
    @utm_source, @utm_medium, @utm_campaign, @utm_content, @utm_term, @yclid, @vk_aid,
    @rb_clickid, @attribution_json, @tg_ok, @crm_ok, @visit_date_time, @goal,
    @client_id, @phone_tail, @webvisor_hint, @dedupe_key
  )
`);

const empty = {
  phone: null, name: null, car_class: null, car_brand: null, service: null,
  photos_json: null, services_json: null, urgency: null, channel: null, source: null, page: null,
  client_timestamp: null, utm_source: null, utm_medium: null, utm_campaign: null,
  utm_content: null, utm_term: null, yclid: null, vk_aid: null, rb_clickid: null,
  attribution_json: null, tg_ok: null, crm_ok: null, visit_date_time: null,
  goal: null, client_id: null, phone_tail: null, webvisor_hint: null,
};

function normalizePhone(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) return `+7${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("9")) return `+7${digits}`;
  return digits ? `+${digits}` : null;
}

const webvisorArg = process.argv.indexOf("--webvisor");
let inserted = 0;
let skipped = 0;

if (webvisorArg >= 0) {
  const file = process.argv[webvisorArg + 1];
  if (!file || !existsSync(file)) {
    console.error("Укажите CSV: node scripts/import-leads.mjs --webvisor file.csv");
    process.exit(1);
  }
  const lines = readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(1)) {
    const [visitDateTime, clientID, goal, page, phoneTail, durationSec, device] = line.split(";");
    if (!visitDateTime || !clientID) continue;
    // Метрика отдаёт время МСК; в РФ нет перевода часов — фиксированный +03:00
    const createdAt = new Date(visitDateTime.replace(" ", "T") + "+03:00").toISOString();
    const now = new Date().toISOString();
    const r = insert.run({
      ...empty,
      created_at: createdAt,
      updated_at: now,
      status: "needs_phone",
      origin: "webvisor",
      page: page || null,
      goal: goal || null,
      client_id: clientID,
      phone_tail: phoneTail || null,
      visit_date_time: visitDateTime,
      webvisor_hint: `Вебвизор → дата ${visitDateTime} (МСК), страница ${page || "—"}, ${device || ""} ${durationSec ? `, визит ${durationSec}с` : ""}`.trim(),
      dedupe_key: `wv:${clientID}:${visitDateTime}:${goal || ""}`,
    });
    r.changes ? inserted++ : skipped++;
  }
} else {
  const file = path.join(dataDir, "leads.jsonl");
  if (!existsSync(file)) {
    console.error("data/leads.jsonl не найден");
    process.exit(1);
  }
  const lines = readFileSync(file, "utf8").split("\n").filter(Boolean);
  for (const line of lines) {
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      skipped++;
      continue;
    }
    const lead = rec.lead ?? {};
    const now = new Date().toISOString();
    const r = insert.run({
      ...empty,
      created_at: rec.receivedAt ?? now,
      updated_at: now,
      status: "new",
      origin: "import-jsonl",
      phone: normalizePhone(lead.phone),
      name: lead.name ?? null,
      car_class: lead.carClass ?? null,
      car_brand: lead.carBrand ?? null,
      service: lead.service ?? null,
      services_json: lead.services?.length ? JSON.stringify(lead.services) : null,
      photos_json: lead.photos?.length ? JSON.stringify(lead.photos) : null,
      urgency: lead.urgency ?? null,
      channel: lead.channel ?? null,
      source: lead.source ?? null,
      page: lead.page ?? null,
      client_timestamp: lead.timestamp ?? null,
      utm_source: lead.utm?.utm_source ?? null,
      utm_medium: lead.utm?.utm_medium ?? null,
      utm_campaign: lead.utm?.utm_campaign ?? null,
      utm_content: lead.utm?.utm_content ?? null,
      utm_term: lead.utm?.utm_term ?? null,
      yclid: lead.utm?.yclid ?? null,
      vk_aid: lead.utm?.vk_aid ?? null,
      rb_clickid: lead.utm?.rb_clickid ?? null,
      attribution_json: lead.attribution ? JSON.stringify(lead.attribution) : null,
      tg_ok: rec.tgOk == null ? null : rec.tgOk ? 1 : 0,
      crm_ok: rec.crmOk == null ? null : rec.crmOk ? 1 : 0,
      // Тот же ключ, что считает /api/submit — живой insert и импорт не дублируются
      dedupe_key: createHash("sha256").update(line).digest("hex"),
    });
    r.changes ? inserted++ : skipped++;
  }
}

console.log(`Импортировано: ${inserted}, пропущено (дубли/битые): ${skipped}`);
console.log(`Всего в CRM: ${db.prepare("SELECT COUNT(*) n FROM leads").get().n}`);
