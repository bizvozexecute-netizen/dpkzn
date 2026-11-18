// Проверка миграции 0005 (alarm_landings):
// 1) «существующая» БД: миграции 0000–0004 + копия данных из data/detailing.db, затем полный набор —
//    число строк во всех старых таблицах не меняется;
// 2) повторный запуск — no-op, правка владельца в посадочной сохраняется;
// 3) чистая БД — посадочные появляются из миграции.
// Временные БД: data/migtest-*.db (в .gitignore). Запуск: node scripts/check-alarm-migration.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const old = fs.mkdtempSync(path.join(os.tmpdir(), "alarm-mig-"));
fs.cpSync(path.join(root, "drizzle"), old, { recursive: true });
fs.rmSync(path.join(old, "0005_alarm_landings.sql"));
const j = JSON.parse(fs.readFileSync(path.join(old, "meta/_journal.json"), "utf8"));
j.entries = j.entries.filter((e) => e.idx < 5);
fs.writeFileSync(path.join(old, "meta/_journal.json"), JSON.stringify(j));

const file = path.join(root, "data/migtest-existing.db");
const cleanFile = path.join(root, "data/migtest-clean.db");
for (const f of [file, cleanFile]) fs.rmSync(f, { force: true });

let sq = new Database(file);
migrate(drizzle(sq), { migrationsFolder: old });
const src = new Database(path.join(root, "data/detailing.db"), { readonly: true });
const tables = src
  .prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%' and name not like '__drizzle%' and name != 'alarm_landings'")
  .all()
  .map((r) => r.name);
sq.pragma("foreign_keys = OFF");
const before = {};
for (const t of tables) {
  const rows = src.prepare(`select * from "${t}"`).all();
  for (const r of rows) {
    const cols = Object.keys(r);
    sq.prepare(`insert into "${t}" (${cols.map((c) => `"${c}"`).join(",")}) values (${cols.map(() => "?").join(",")})`).run(...cols.map((c) => r[c]));
  }
  before[t] = rows.length;
}
sq.close();

sq = new Database(file);
migrate(drizzle(sq), { migrationsFolder: path.join(root, "drizzle") });
let lost = 0;
for (const t of tables) {
  const n = sq.prepare(`select count(*) c from "${t}"`).get().c;
  if (n !== before[t]) {
    lost++;
    console.log("MISMATCH", t, before[t], n);
  }
}
const landings = sq.prepare("select slug from alarm_landings order by sort_order").all().map((r) => r.slug);
sq.prepare("update alarm_landings set lead='OWNER EDIT' where slug='avtozapusk'").run();
migrate(drizzle(sq), { migrationsFolder: path.join(root, "drizzle") });
const kept = sq.prepare("select lead from alarm_landings where slug='avtozapusk'").get().lead === "OWNER EDIT";
sq.close();

const clean = new Database(cleanFile);
migrate(drizzle(clean), { migrationsFolder: path.join(root, "drizzle") });
const cleanLandings = clean.prepare("select count(*) c from alarm_landings").get().c;
clean.close();

const rowsBefore = Object.values(before).reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ tablesChecked: tables.length, rowsBefore, lostTables: lost, landings, ownerEditKept: kept, cleanLandings }));

// Заявки здесь не читаются: в рабочей БД могут быть персональные данные клиентов.
// Source/UTM тестовой заявки проверяет scripts/check-alarm-pages.mjs во временной папке.
process.exit(lost || !kept || cleanLandings < 1 ? 1 : 0);
