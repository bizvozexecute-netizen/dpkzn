/** Apply the owner's copy corrections without reseeding the content database. */
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import path from "node:path";

const dbPath = process.env.CONTENT_DB_PATH || path.join(process.cwd(), "data", "detailing.db");
if (!existsSync(dbPath)) throw new Error(`Content database not found: ${dbPath}`);
const db = new Database(dbPath, { fileMustExist: true });
db.pragma("busy_timeout = 5000");

// These replacements only touch public text, not slugs, prices or contact data.
function updateText(value) {
  return value
    .replace(/\s+(?:за|в течение)\s+15\s+минут/giu, "")
    .replace(/\s*\(LLumar, SunTek\)/gi, "")
    .replace(/В нашей студии на Ямашева 7к1 работаем с премиальными плёнками LLumar Platinum, SunTek Ultra и SunTek Reaction\./gi, "В нашей студии на Ямашева 7к1 работаем с полиуретановой антигравийной плёнкой.")
    .replace(/Работаем с премиальными плёнками LLumar и SunTek \(США\)/gi, "Работаем с тонировочными плёнками")
    .replace(/Премиальные плёнки LLumar и SunTek с УФ-защитой/gi, "Тонировочные плёнки с УФ-защитой")
    .replace(/о премиальных плёнках LLumar и SunTek/gi, "о полиуретановой антигравийной плёнке")
    .replace(/О премиальных плёнках LLumar и SunTek/gi, "О полиуретановой антигравийной плёнке")
    .replace(/Плёнка LLumar или SunTek/gi, "Полиуретановая антигравийная плёнка")
    .replace(/бренды LLumar и SunTek/gi, "характеристики материала")
    .replace(/\(LLumar Platinum, SunTek Ultra, XPEL Ultimate Plus\)/gi, "")
    .replace(/Топ-3 в РФ: LLumar \(США\), SunTek \(США\), Hexis \(Франция\)\./gi, "Условия гарантии зависят от выбранного материала.")
    .replace(/работаем только с премиальными плёнками LLumar и SunTek/gi, "подбираем полиуретановую антигравийную плёнку под задачу")
    .replace(/работаем с премиальными плёнками LLumar \(США\) и SunTek/gi, "подбираем тонировочную плёнку под автомобиль")
    .replace(/В нашей студии мы видим машины, оклеенные 4-5 лет назад на LLumar и SunTek — плёнка как новая\./gi, "Состояние плёнки зависит от ухода, условий эксплуатации и материала.")
    .replace(/\(LLumar, SunTek, Hexis\)/gi, "")
    .replace(/\(если LLumar, SunTek, Hexis\)/gi, "если материал обладает таким свойством")
    .replace(/\(LLumar, Ceramic Pro, Gyeon\)/gi, "")
    .replace(/Топовые бренды \(LLumar AIR, SunTek CXP, 3M Crystalline\) предлагают плёнки/gi, "Атермальные плёнки могут иметь разные характеристики и светопропускание; некоторые материалы имеют показатели")
    .replace(/Атермальная плёнка LLumar AIR 80 — около 12 000-15 000 ₽ на одно лобовое стекло\. SunTek CXP — 14 000-17 000 ₽\./gi, "Стоимость атермальной плёнки зависит от материала и автомобиля; уточняйте цену перед записью.")
    .replace(/В Detailing Place работаем с LLumar и SunTek\./gi, "В Detailing Place подберём подходящую тонировочную плёнку.")
    .replace(/Работаем с премиальной съёмной плёнкой LLumar/gi, "Работаем со съёмной тонировочной плёнкой")
    .replace(/\(например, 80% LLumar AIR\)/gi, "")
    .replace(/\(керамические нанокомпозиты — LLumar Air, 3M Crystalline\)/gi, "")
    .replace(/\(LLumar AIR 80, 3M Crystalline\)/gi, "")
    .replace(/премиум-плёнкой LLumar/gi, "тонировочной плёнкой")
    .replace(/\(плёнка LLumar AIR 80\)/gi, "")
    .replace(/Дорогая плёнка LLumar/gi, "Дорогая антигравийная плёнка")
    .replace(/LLumar, SunTek/gi, "Полиуретановая антигравийная плёнка")
    .replace(/Полиуретановая защита кузова от сколов, царапин и реагентов\. Полиуретановая антигравийная плёнка/gi, "Полиуретановая антигравийная плёнка защищает кузов от сколов, царапин и реагентов")
    .replace(/Все они обладают эффектом самозатягивания/gi, "Некоторые плёнки обладают эффектом самозатягивания")
    .replace(/\s+([,.!?])/g, "$1");
}

const columns = {
  services: ["subtitle", "seo_description", "seo_text"],
  service_usp: ["text"], service_faq: ["answer"], package_features: ["text"],
  blog_posts: ["title", "excerpt", "content"],
};
const changes = [];
for (const [table, fields] of Object.entries(columns)) {
  for (const field of fields) {
    const slugField = table === "blog_posts" ? ", slug" : "";
    for (const row of db.prepare(`SELECT id${slugField}, "${field}" AS value FROM "${table}" WHERE "${field}" IS NOT NULL`).all()) {
      let next = updateText(row.value);
      if (table === "blog_posts" && row.slug === "kak-vybrat-ppf-llumar-suntek") {
        // The former brand-comparison article is now a general guide; keep its URL.
        if (field === "title") next = "Как выбрать антигравийную плёнку PPF";
        else if (field === "excerpt") next = "Как выбрать полиуретановую защитную плёнку: прозрачность, толщина, уход и условия гарантии.";
        else next = "<p>Полиуретановая антигравийная плёнка защищает лак от сколов и следов повседневной эксплуатации. Материал подбирают под автомобиль и условия его использования.</p><h2>На что обратить внимание</h2><p>Сравните прозрачность, толщину, особенности ухода и условия гарантии. Некоторые плёнки способны восстанавливать мелкие царапины при нагреве; уточните свойства конкретного материала перед оклейкой.</p><h2>Как выбрать объём оклейки</h2><p>Можно защитить отдельные детали, переднюю часть автомобиля или кузов целиком. Стоимость зависит от автомобиля, площади и материала. Напишите нам и пришлите фото — поможем подобрать вариант.</p>";
      }
      if (/LLumar|SunTek/i.test(next)) throw new Error(`Unmapped film name in ${table}.${field}, id ${row.id}; no changes applied`);
      if (next !== row.value) changes.push({ table, field, id: row.id, value: next });
    }
  }
}
const statRows = db.prepare("SELECT id, value FROM stats WHERE label = ?").all("Опыт работы");
const brands = db.prepare("SELECT id FROM partner_brands WHERE lower(name) IN ('llumar', 'suntek')").all();
if (changes.length || statRows.some((r) => r.value !== "с 2018 года") || brands.length) {
  const backupPath = `${dbPath}.owner-copy-${Date.now()}.db`;
  await db.backup(backupPath);
  db.transaction(() => {
    for (const c of changes) db.prepare(`UPDATE "${c.table}" SET "${c.field}" = ? WHERE id = ?`).run(c.value, c.id);
    db.prepare("UPDATE stats SET value = ? WHERE label = ?").run("с 2018 года", "Опыт работы");
    db.prepare("DELETE FROM partner_brands WHERE lower(name) IN ('llumar', 'suntek')").run();
  })();
  console.log(`Updated ${changes.length} text fields. Backup: ${backupPath}`);
} else console.log("Owner copy is already up to date.");
db.close();
