import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./leads-schema";
import { LEADS_DDL } from "./leads-schema";

/**
 * Соединение микро-CRM — отдельный файл data/leads.db.
 *
 * Почему не detailing.db: её пересоздаёт каждый деплой (db:seed), а заявки —
 * данные бизнеса, они обязаны переживать что угодно. Файл создаётся лениво,
 * таблица — через CREATE TABLE IF NOT EXISTS (см. leads-schema.ts).
 * busy_timeout: рядом может писать import-скрипт — короткие вставки при WAL
 * дождутся друг друга вместо SQLITE_BUSY.
 */
const dbDir = process.env.LEADS_DATA_DIR || path.join(process.cwd(), "data");
mkdirSync(dbDir, { recursive: true });

const sqlite = new Database(path.join(dbDir, "leads.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");
sqlite.exec(LEADS_DDL);
if (!(sqlite.prepare("PRAGMA table_info(leads)").all() as {name:string}[]).some(c=>c.name==="photos_json")) {
  sqlite.exec("ALTER TABLE leads ADD COLUMN photos_json TEXT");
}

sqlite.transaction(() => {
  const columns = sqlite.prepare("PRAGMA table_info(leads)").all() as {name:string}[];
  for (const name of ["visit_id", "booked_at"]) {
    if (!columns.some(column => column.name === name)) sqlite.exec(`ALTER TABLE leads ADD COLUMN ${name} TEXT`);
  }
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS funnel_visits (
      id TEXT PRIMARY KEY, started_at TEXT NOT NULL, landing TEXT NOT NULL,
      source TEXT NOT NULL, medium TEXT NOT NULL, campaign TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS contact_touches (
      code TEXT PRIMARY KEY, visit_id TEXT, page TEXT, channel TEXT NOT NULL,
      clicked_at TEXT, lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL, confirmed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS contact_touches_lead ON contact_touches(lead_id);
    CREATE INDEX IF NOT EXISTS contact_touches_visit ON contact_touches(visit_id);
    CREATE INDEX IF NOT EXISTS funnel_visits_date ON funnel_visits(started_at);
    CREATE INDEX IF NOT EXISTS leads_visit ON leads(visit_id);
    CREATE TRIGGER IF NOT EXISTS leads_first_booking AFTER UPDATE OF status ON leads
    WHEN NEW.status='booked' AND NEW.booked_at IS NULL
    BEGIN UPDATE leads SET booked_at=NEW.updated_at WHERE id=NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS leads_new_booking AFTER INSERT ON leads
    WHEN NEW.status='booked' AND NEW.booked_at IS NULL
    BEGIN UPDATE leads SET booked_at=NEW.created_at WHERE id=NEW.id; END;
  `);
}).immediate();

export const leadsDb = drizzle(sqlite, { schema });
