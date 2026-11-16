import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Схема микро-CRM (data/leads.db — ОТДЕЛЬНЫЙ файл от detailing.db!).
 *
 * Основная БД пересеивается на каждом деплое (build = db:migrate + db:seed),
 * поэтому заявки живут в собственной базе, которую сид не трогает. Миграции
 * drizzle-kit сюда не подключены: таблицу создаёт LEADS_DDL при инициализации
 * соединения (src/lib/db/leads.ts) — «CREATE TABLE IF NOT EXISTS» достаточно
 * для одной таблицы, а build-пайплайн остаётся нетронутым.
 *
 * ВАЖНО: drizzle-объект ниже и LEADS_DDL описывают одну и ту же таблицу —
 * менять их только парой (плюс копия DDL в scripts/import-leads.mjs).
 */

export const LEAD_STATUSES = ["new", "in_progress", "booked", "won", "lost", "needs_phone"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_ORIGINS = ["site", "import-jsonl", "webvisor", "manual"] as const;
export type LeadOrigin = (typeof LEAD_ORIGINS)[number];

export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  status: text("status").notNull().default("new"),
  origin: text("origin").notNull().default("site"),

  phone: text("phone"),
  name: text("name"),
  carClass: text("car_class"),
  carBrand: text("car_brand"),
  service: text("service"),
  servicesJson: text("services_json"),
  photosJson: text("photos_json"),
  urgency: text("urgency"),
  channel: text("channel"),
  source: text("source"),
  page: text("page"),
  clientTimestamp: text("client_timestamp"),

  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  yclid: text("yclid"),
  vkAid: text("vk_aid"),
  rbClickid: text("rb_clickid"),
  attributionJson: text("attribution_json"),

  tgOk: integer("tg_ok", { mode: "boolean" }),
  crmOk: integer("crm_ok", { mode: "boolean" }),

  // Кандидаты из вебвизора Метрики: номер достаёт владелец из записи визита
  visitDateTime: text("visit_date_time"),
  goal: text("goal"),
  clientId: text("client_id"),
  phoneTail: text("phone_tail"),
  webvisorHint: text("webvisor_hint"),

  visitId: text("visit_id"),
  bookedAt: text("booked_at"),
  managerNote: text("manager_note"),
  /** Ключ идемпотентности: sha256 строки журнала / wv:{clientId}:{dt}:{goal}; NULL у ручных */
  dedupeKey: text("dedupe_key"),
});

export const LEADS_DDL = `
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
