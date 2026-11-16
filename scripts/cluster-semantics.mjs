// Кластеризация запросов -> docs/seo/semantic-core.csv + сводка.
// Источник частотности: docs/seo/wordstat-kazan.tsv (Wordstat, Казань, месяц).
// Вторичный сигнал (клики/конверсии) — из прошлой выгрузки Директа .tmp_xlsx/queries.tsv (если есть).
// Запуск: node scripts/cluster-semantics.mjs
import fs from "node:fs";

// клики/конверсии из Директа по совпадению фразы
const conv = new Map();
try {
  for (const l of fs.readFileSync(".tmp_xlsx/queries.tsv", "utf8").split("\n").slice(1)) {
    if (!l) continue;
    const [q, , clicks, c] = l.split("\t");
    if (q) conv.set(q.toLowerCase(), { clicks: +clicks || 0, conv: +c || 0 });
  }
} catch {
  /* выгрузки Директа может не быть — это ок */
}

const rows = fs
  .readFileSync("docs/seo/wordstat-kazan.tsv", "utf8")
  .split("\n")
  .slice(1)
  .filter(Boolean)
  .map((l) => {
    const [query, count] = l.split("\t");
    const cv = conv.get(query.toLowerCase()) || { clicks: 0, conv: 0 };
    return { query, shows: +count || 0, clicks: cv.clicks, conv: cv.conv };
  });

// Стоп: бренды конкурентов / другие города / нерелевантное (DIY, товары, обучение,
// другие домены: балконы/окна/пожарная сигнализация) -> исключаем из СЯ полностью.
const STOP = [
  // конкуренты-бренды
  "brooklands", "reforma", "форсаж", "урбан", "urban", "триада", "биг босс", "big boss",
  "автор детейлинг", "ламарк", "антикор лайф", "антикор рф", "антикор маркет", "бронефф",
  // другие города
  "москва", "спб", "санкт-петербург", "екатеринбург", "нижнекамск", "челны", "уфа",
  "самара", "ижевск", "чебоксар", "йошкар", "белгород", "вятские поляны", "брянск",
  // DIY / товары / оборудование
  "купить", "полироль", "полироли", "насадк", "болгарк", "круг для", "круги для",
  "инструмент для", "набор", "крем для", "пена для", "паста для", "своими руками",
  "самостоятельн", "в домашних", "домашних услови", "домашн", "расходник", "оборудование для",
  "шуруповерт", "без машинки", "самому", "средство для", "машинка",
  // обучение / работа / маркетплейсы
  "обучени", "курс", "урок", "видео", "работа в", "ваканси", "зарплат", "авито", "юла", "магазин",
  // другие домены (не авто)
  "балкон", "витрин", "пожарн", "окон ", "теплиц", "для дома",
  // нецелевые форматы
  "реклам", "такси",
];

// Информационный интент
function isInfo(q) {
  return /(что это|что такое|простыми словами|^как |\sкак |почему|зачем|сколько служ|сколько держ|можно ли|нужно ли|чем отлич|отлич|разниц| vs | или |своими руками|миф|вред|плюсы и минусы|стоит ли|чем лучше|какой лучше|какая лучше|рейтинг|обзор|отзыв)/i.test(
    q
  );
}

// Кластеры: порядок важен (специфичные -> общие). Первое совпадение выигрывает.
// W = «словесный символ» с поддержкой кириллицы (JS \w кириллицу НЕ ловит).
const W = "[а-яёa-z0-9]";
const rx = (src) => new RegExp(src.replaceAll("\\w", W), "i");
const RULES = [
  ["antihrom", "/antihrom", rx("(антихром|хромирован|хромировк|затемнен\\w*\\s+хром|молдинг)")],
  ["ustanovka-linz", "/ustanovka-linz", rx("(линз|bi-?led|би-?лед|билед|переходные линзы)")],
  ["polirovka-far", "/polirovka-far", rx("полировк\\w*\\s+фар|фар\\w*\\s+полировк|восстановлен\\w*\\s+фар|реставрац\\w*\\s+фар")],
  ["regulirovka-far", "/regulirovka-far", rx("(регулировк\\w*\\s+фар|ремонт\\w*\\s+фар|ремонт фар|сделать фары|замена стекол? фар|замена.*противотуман|замена птф|где.*фар|по замене стекол в фаре|сто.*фар)")],
  ["polirovka-stekol", "/polirovka-stekol", rx("полировк\\w*\\s+(стек|лобов)")],
  ["antidozhd", "/antidozhd", rx("антидожд|антидождь")],
  ["remont-vmyatin", "/remont-vmyatin", rx("(вмятин|\\bpdr\\b|удаление вмятин|выправ)")],
  ["shumoizolyaciya", "/shumoizolyaciya", rx("(шумоизол|шумк[аеуи]|шумовиброизол|виброизол)")],
  ["himchistka", "/himchistka", rx("(химчист|чистк\\w*\\s+салон|плесен|мойка двигател|озонир)")],
  ["ustanovka-signalizacii", "/ustanovka-signalizacii", rx("(сигнализац|автозапуск|starline|старлайн|пандора|pandora|иммобилайзер|gps.?маяк)")],
  ["tonirovka", "/tonirovka", rx("(тонир|затонир|атермаль|атермалк|тонировк|съемная тонир|растонир)")],
  ["broneplenka", "/broneplenka", rx("(бронепл|бронепленк|бронеплёнк|бронирован|забронир|бронь кузов|защит\\w*\\s+(пл[её]нк\\w*\\s+)?(стекл|лобов)|защитн\\w*\\s+пл[её]нк)")],
  ["ppf", "/ppf", rx("(\\bppf\\b|\\bппф\\b|антигравийн|антигравийк|полиуретанов|оклейка плёнк\\w* капот|пленка на капот|защита кузова пл)")],
  ["oklejka-avto", "/oklejka-avto", rx("(оклейк|обклейк|обкле|автовинил|винил|оклеить|обтян|цветн\\w*\\s+пл[её]нк|смена цвета|перекл|карбон\\w*\\s+пл|матов\\w*\\s+пл|глянц\\w*\\s+пл|kpmf|антиблик|брендирован|пл[её]нк)")],
  ["antikor", "/antikor", rx("(антикор|антикорроз|антикоррозийн|обработка дни\\w*|подкрылен|подкрыльн|обработк\\w*\\s+скрыт)")],
  ["zashchitnye-pokrytiya", "/zashchitnye-pokrytiya", rx("(защитн\\w*\\s+покрыт|жидкое стекло|воск|нанокерам(?!.*пленк)|гравийн\\w*\\s+обработк)")],
  ["polirovka", "/polirovka", rx("(полировк|керамик|керамическое покрыт|восстановительн\\w*\\s+полир|абразивн)")],
  ["vyezdnoj-detayling", "/vyezdnoj-detayling", rx("(выездн\\w*\\s+детейл|детейл\\w*\\s+на выезд|выезд\\w*\\s+мойк|детейл\\w*\\s+с выезд|детейл\\w*\\s+с очисткой)")],
  ["detayling-kuzova", "/detayling-kuzova", rx("(детейл|detailing|детел)")],
];

const clusters = new Map();
const unmatched = [];

for (const r of rows) {
  const q = r.query.toLowerCase();
  if (STOP.some((s) => q.includes(s))) continue;
  let matched = null;
  for (const [name, url, re] of RULES) {
    if (re.test(q)) {
      matched = { name, url };
      break;
    }
  }
  if (!matched) {
    unmatched.push(r);
    continue;
  }
  const info = isInfo(r.query);
  const key = matched.name + (info ? "::info" : "");
  const c = clusters.get(key) || {
    cluster: matched.name,
    url: info ? "/blog (info)" : matched.url,
    intent: info ? "info" : "commercial",
    queries: [],
    shows: 0,
    clicks: 0,
    conv: 0,
  };
  c.queries.push(r);
  c.shows += r.shows;
  c.clicks += r.clicks;
  c.conv += r.conv;
  clusters.set(key, c);
}

/* ---- CSV ---- */
const csv = ["query,shows,clicks,conv,cluster,intent,target_url"];
const all = [...clusters.values()].sort((a, b) => b.shows - a.shows);
for (const c of all) {
  for (const q of c.queries.sort((a, b) => b.shows - a.shows)) {
    const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
    csv.push(
      [esc(q.query), q.shows, q.clicks, q.conv, c.cluster, c.intent, esc(c.url)].join(",")
    );
  }
}
fs.mkdirSync("docs/seo", { recursive: true });
fs.writeFileSync("docs/seo/semantic-core.csv", csv.join("\n"), "utf8");

/* ---- semantic-core.md (карта работ) ---- */
// Закрепление коммерческих кластеров за страницами + рекомендованные мета.
const RECO = {
  "detayling-kuzova": {
    page: "/detayling-kuzova (NEW) + головной терм «детейлинг казань» -> главная /",
    title: "Детейлинг кузова в Казани — комплексный детейлинг авто | Detailing Place",
    h1: "Детейлинг кузова автомобиля в Казани",
    desc: "Комплексный детейлинг кузова и салона в Казани: полировка, защита, химчистка. Расчёт по фото за 15 минут — звоните.",
  },
  "oklejka-avto": {
    page: "/oklejka-avto (NEW)",
    title: "Оклейка авто плёнкой в Казани — цены, винил, смена цвета | Detailing Place",
    h1: "Оклейка авто плёнкой в Казани",
    desc: "Оклейка авто плёнкой в Казани: винил, матовая, глянцевая, смена цвета. Расчёт по фото за 15 минут — звоните.",
  },
  tonirovka: {
    page: "/tonirovka",
    title: "Тонировка авто в Казани — цены, атермальная плёнка | Detailing Place",
    h1: "Тонировка авто в Казани",
    desc: "Тонировка авто в Казани по ГОСТ: атермальная, съёмная, премиум. Цены и расчёт за 15 минут — звоните.",
  },
  antihrom: {
    page: "/antihrom",
    title: "Антихром в Казани — затемнение хрома на авто | Detailing Place",
    h1: "Антихром автомобиля в Казани",
    desc: "Антихром в Казани: затемнение хромированных молдингов и решётки плёнкой или покраской. Расчёт по фото — звоните.",
  },
  broneplenka: {
    page: "/broneplenka (NEW)",
    title: "Бронепленка на авто в Казани — бронирование кузова | Detailing Place",
    h1: "Бронепленка на автомобиль в Казани",
    desc: "Бронирование авто плёнкой в Казани: капот, фары, зоны риска и кузов целиком. Защита от сколов. Расчёт по фото — звоните.",
  },
  polirovka: {
    page: "/polirovka",
    title: "Полировка кузова и керамика в Казани — цены | Detailing Place",
    h1: "Полировка кузова и керамическое покрытие в Казани",
    desc: "Полировка кузова и керамическое покрытие авто в Казани. Убираем риски и голограммы, замер ЛКП. Расчёт по фото — звоните.",
  },
  himchistka: {
    page: "/himchistka",
    title: "Химчистка салона авто в Казани — цены, выезд | Detailing Place",
    h1: "Химчистка салона автомобиля в Казани",
    desc: "Химчистка салона авто в Казани: удаление пятен, запахов, плесени, озонирование. Цены и расчёт за 15 минут — звоните.",
  },
  antikor: {
    page: "/antikor (NEW)",
    title: "Антикор авто в Казани — антикоррозийная обработка | Detailing Place",
    h1: "Антикор автомобиля в Казани",
    desc: "Антикор и антикоррозийная обработка днища и скрытых полостей авто в Казани. Защита от ржавчины и реагентов. Цена по фото — звоните.",
  },
  ppf: {
    page: "/ppf",
    title: "Антигравийная плёнка PPF в Казани — цены, оклейка | Detailing Place",
    h1: "Антигравийная плёнка (PPF) на авто в Казани",
    desc: "Антигравийная плёнка PPF (LLumar, SunTek) на кузов авто в Казани. Защита от сколов, гарантия 7 лет. Расчёт по фото — звоните.",
  },
  "regulirovka-far": {
    page: "/regulirovka-far",
    title: "Ремонт и регулировка фар в Казани — на стенде | Detailing Place",
    h1: "Ремонт и регулировка фар в Казани",
    desc: "Регулировка, ремонт и восстановление фар в Казани на стенде. Замена стёкол и ламп. Запись и расчёт за 15 минут — звоните.",
  },
  "polirovka-far": {
    page: "/polirovka-far",
    title: "Полировка фар в Казани — восстановление прозрачности | Detailing Place",
    h1: "Полировка фар в Казани",
    desc: "Полировка фар авто в Казани: убираем мутность и желтизну, восстанавливаем свет. Расчёт за 15 минут — звоните.",
  },
  "zashchitnye-pokrytiya": {
    page: "/zashchitnye-pokrytiya",
    title: "Защитные покрытия авто в Казани — керамика, воск, антикор | Detailing Place",
    h1: "Защитные покрытия кузова авто в Казани",
    desc: "Защитные покрытия кузова в Казани: керамика, жидкое стекло, воск, антикор днища. Расчёт по фото — звоните.",
  },
  "ustanovka-linz": {
    page: "/ustanovka-linz",
    title: "Установка Bi-LED линз в фары в Казани — цены | Detailing Place",
    h1: "Установка Bi-LED линз в Казани",
    desc: "Установка Bi-LED линз в фары в Казани: яркий свет, чёткая СТГ, гарантия. Запись и расчёт за 15 минут — звоните.",
  },
  shumoizolyaciya: {
    page: "/shumoizolyaciya",
    title: "Шумоизоляция авто в Казани — цены, материалы | Detailing Place",
    h1: "Шумоизоляция автомобиля в Казани",
    desc: "Шумоизоляция авто в Казани (Comfort Mat, STP): тише в салоне, меньше вибраций. Расчёт по фото за 15 минут — звоните.",
  },
  "polirovka-stekol": {
    page: "/polirovka-stekol",
    title: "Полировка стёкол авто в Казани — убрать царапины | Detailing Place",
    h1: "Полировка стёкол автомобиля в Казани",
    desc: "Полировка лобового и боковых стёкол в Казани: убираем царапины и затёртости от дворников. Расчёт — звоните.",
  },
  antidozhd: {
    page: "/antidozhd",
    title: "Антидождь на стекло авто в Казани — цены | Detailing Place",
    h1: "Антидождь на лобовое стекло в Казани",
    desc: "Антидождь на лобовое стекло авто в Казани: лучше видимость в дождь, дольше служат дворники. Запись — звоните.",
  },
  "remont-vmyatin": {
    page: "/remont-vmyatin",
    title: "Ремонт вмятин без покраски (PDR) в Казани | Detailing Place",
    h1: "Ремонт вмятин без покраски (PDR) в Казани",
    desc: "Удаление вмятин без покраски (PDR) в Казани: сохраняем заводское ЛКП, быстро и аккуратно. Расчёт по фото — звоните.",
  },
  "ustanovka-signalizacii": {
    page: "/ustanovka-signalizacii",
    title: "Установка сигнализации с автозапуском в Казани | Detailing Place",
    h1: "Установка сигнализации в Казани",
    desc: "Установка сигнализации с автозапуском в Казани (StarLine, Pandora): GSM, метки, защита. Запись и расчёт — звоните.",
  },
  "vyezdnoj-detayling": {
    page: "/vyezdnoj-detayling (NEW)",
    title: "Выездной детейлинг в Казани — мойка и уход у вас | Detailing Place",
    h1: "Выездной детейлинг в Казани",
    desc: "Выездной детейлинг в Казани: химчистка, полировка и уход за авто с выездом к вам. Запись и расчёт за 15 минут — звоните.",
  },
};

const mdMatched = all.reduce((s, c) => s + c.queries.length, 0);
const mdUnShows = unmatched.reduce((s, x) => s + x.shows, 0);
const md = [];
md.push("# Семантическое ядро — Detailing Place (Казань)\n");
md.push(
  "Источник: реальная выгрузка перформанс-кампаний Яндекс.Директа за 21.04–21.05.2026 " +
    `(${rows.length} уникальных поисковых запросов). Частотность = сумма показов за период.\n`
);
md.push(
  `**Покрытие:** кластеризовано ${mdMatched} запросов, длинный хвост ${unmatched.length} (${mdUnShows} показов).\n`
);
md.push("Полный список запросов с привязкой — в `semantic-core.csv`.\n");

md.push("## Карта «кластер → страница»\n");
md.push("| Кластер | Интент | Запросов | Показы | Клики | Конв. | Страница |");
md.push("|---|---|--:|--:|--:|--:|---|");
for (const c of all) {
  const page = c.intent === "info" ? "блог (инфо-статьи)" : RECO[c.cluster]?.page || c.url;
  md.push(
    `| ${c.cluster} | ${c.intent} | ${c.queries.length} | ${c.shows} | ${c.clicks} | ${c.conv} | ${page} |`
  );
}
md.push("");

md.push("## Коммерческие кластеры — рекомендованные мета и ключи\n");
const comm = all.filter((c) => c.intent === "commercial");
for (const c of comm) {
  const r = RECO[c.cluster] || {};
  md.push(`### ${c.cluster} → ${r.page || c.url}`);
  md.push(`- **Показы:** ${c.shows} · **запросов:** ${c.queries.length} · **клики:** ${c.clicks} · **конв.:** ${c.conv}`);
  if (r.title) md.push(`- **title:** ${r.title} (${r.title.length} симв.)`);
  if (r.h1) md.push(`- **H1:** ${r.h1}`);
  if (r.desc) md.push(`- **description:** ${r.desc} (${r.desc.length} симв.)`);
  md.push(`- **Топ-запросы (частотность):**`);
  for (const q of c.queries.slice(0, 18)) md.push(`  - ${q.query} — ${q.shows}`);
  md.push("");
}

md.push("## Информационные кластеры → блог\n");
const info = all.filter((c) => c.intent === "info");
for (const c of info) {
  md.push(`### ${c.cluster} (инфо) — ${c.shows} показов, ${c.queries.length} запросов`);
  for (const q of c.queries.slice(0, 12)) md.push(`- ${q.query} — ${q.shows}`);
  md.push("");
}

fs.writeFileSync("docs/seo/semantic-core.md", md.join("\n"), "utf8");
console.error("записано docs/seo/semantic-core.md и .csv");

/* ---- сводка ---- */
console.log("CLUSTER\tINTENT\tQUERIES\tSHOWS\tCLICKS\tCONV\tURL");
for (const c of all)
  console.log(
    `${c.cluster}\t${c.intent}\t${c.queries.length}\t${c.shows}\t${c.clicks}\t${c.conv}\t${c.url}`
  );

const totalMatched = all.reduce((s, c) => s + c.queries.length, 0);
const unShows = unmatched.reduce((s, x) => s + x.shows, 0);
console.log(`\nВсего запросов: ${rows.length}, кластеризовано: ${totalMatched}, не сопоставлено: ${unmatched.length} (показов ${unShows})`);
console.log("\n=== ТОП-40 не сопоставленных (по показам) ===");
for (const x of unmatched.sort((a, b) => b.shows - a.shows).slice(0, 40))
  console.log(`${x.shows}\t${x.query}`);
