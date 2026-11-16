/**
 * Выгрузка «кандидатов в клиенты» из Метрики (Logs API): визиты июля–августа
 * с лид-целями. Номеров телефонов в API нет — их владелец достаёт из записей
 * вебвизора; скрипт даёт список визитов с точным временем и подсказками.
 *
 * Запуск: node scripts/metrika-leads-export.mjs [date1] [date2]
 * Выход:  data/webvisor-candidates.csv (формат import-leads.mjs --webvisor)
 * Токен:  .claude/yandex-direct.json → direct_token. Данные клиентов в git
 *         не попадают (data/ игнорится).
 */

import { readFileSync, writeFileSync } from "node:fs";

const COUNTER = 108387254;
const { direct_token: TOKEN } = JSON.parse(readFileSync(".claude/yandex-direct.json", "utf8"));
const [date1 = "2026-07-01", date2 = "2026-08-31"] = process.argv.slice(2);

/** Лид-цели: id → человекочитаемый тип заявки */
const LEAD_GOALS = {
  579361446: "Форма: успешная отправка",
  579361448: "Квиз: успешная заявка",
  579361449: "Коллбэк: заявка",
  579361450: "Экзит-попап: заявка",
};
/** Контакты мимо форм: номера клиента не будет, но факт обращения был */
const CONTACT_GOALS = {
  544253622: "Клик на телефон (входящий звонок)",
};

const FIELDS = [
  "ym:s:visitID",
  "ym:s:clientID",
  "ym:s:dateTime",
  "ym:s:startURL",
  "ym:s:goalsID",
  "ym:s:visitDuration",
  "ym:s:deviceCategory",
  "ym:s:operatingSystem",
  "ym:s:regionCity",
  "ym:s:lastTrafficSource",
].join(",");

const api = async (path, init) => {
  // сеть до api-metrika флапает — три попытки с паузой
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      return await fetch(`https://api-metrika.yandex.net${path}`, {
        ...init,
        headers: { Authorization: `OAuth ${TOKEN}`, ...(init?.headers ?? {}) },
      });
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw lastErr;
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. Создать запрос логов
const createRes = await api(
  `/management/v1/counter/${COUNTER}/logrequests?date1=${date1}&date2=${date2}&fields=${FIELDS}&source=visits`,
  { method: "POST" },
);
const created = await createRes.json();
if (!created.log_request) {
  console.error("Не удалось создать запрос логов:", JSON.stringify(created).slice(0, 300));
  process.exit(1);
}
const reqId = created.log_request.request_id;
console.log(`Запрос логов #${reqId} создан (${date1}..${date2})`);

// 2. Дождаться обработки
let parts = 0;
for (let i = 0; i < 60; i++) {
  await wait(5000);
  const st = await (await api(`/management/v1/counter/${COUNTER}/logrequest/${reqId}`)).json();
  const status = st.log_request?.status;
  if (status === "processed") {
    parts = st.log_request.parts?.length ?? 1;
    break;
  }
  if (status === "processing_failed") {
    console.error("Метрика не смогла обработать запрос");
    process.exit(1);
  }
  process.stdout.write(".");
}
if (!parts) {
  console.error("\nТаймаут ожидания логов");
  process.exit(1);
}
console.log(`\nОбработано, частей: ${parts}`);

// 3. Скачать и отфильтровать
const rows = [];
for (let part = 0; part < parts; part++) {
  const tsv = await (
    await api(`/management/v1/counter/${COUNTER}/logrequest/${reqId}/part/${part}/download`)
  ).text();
  const lines = tsv.split("\n").filter(Boolean);
  const header = lines[0].split("\t");
  const col = (name) => header.indexOf(`ym:s:${name}`);
  for (const line of lines.slice(1)) {
    const c = line.split("\t");
    const goals = (c[col("goalsID")] ?? "").replace(/[[\]]/g, "").split(",").filter(Boolean).map(Number);
    const leadGoals = goals.filter((g) => LEAD_GOALS[g]);
    const contactGoals = goals.filter((g) => CONTACT_GOALS[g]);
    if (!leadGoals.length && !contactGoals.length) continue;
    const goalNames = [...leadGoals.map((g) => LEAD_GOALS[g]), ...contactGoals.map((g) => CONTACT_GOALS[g])];
    rows.push({
      dateTime: c[col("dateTime")],
      clientID: c[col("clientID")],
      goal: goalNames.join(" + "),
      page: (c[col("startURL")] ?? "").replace(/https?:\/\/[^/]+/, "") || "/",
      duration: c[col("visitDuration")],
      device: `${c[col("deviceCategory")] === "1" ? "ПК" : c[col("deviceCategory")] === "2" ? "смартфон" : c[col("deviceCategory")]} ${c[col("operatingSystem")] ?? ""}`.trim(),
      region: c[col("regionCity")],
      isLead: leadGoals.length > 0,
    });
  }
}

// 4. Почистить запрос на стороне Метрики (квота)
await api(`/management/v1/counter/${COUNTER}/logrequest/${reqId}/clean`, { method: "POST" }).catch(() => {});

rows.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
const csv = [
  "visitDateTime;clientID;goal;page;phoneTail;durationSec;device",
  ...rows.map((r) => [r.dateTime, r.clientID, r.goal, r.page, "", r.duration, r.device].join(";")),
].join("\n");
writeFileSync("data/webvisor-candidates.csv", csv, "utf8");

console.log(`\nКандидатов: ${rows.length} (заявки: ${rows.filter((r) => r.isLead).length}, звонки-клики: ${rows.filter((r) => !r.isLead).length})`);
console.log("Сводка по времени/страницам:");
for (const r of rows) console.log(`  ${r.dateTime} | ${r.page} | ${r.goal} | ${r.device} | ${r.region}`);
console.log("\nCSV: data/webvisor-candidates.csv → node scripts/import-leads.mjs --webvisor data/webvisor-candidates.csv");
