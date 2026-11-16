/**
 * Сравнение снапшотов before/after — гейт правила «SEO переносится 1:1».
 *
 * Запуск:  node scripts/content-diff.mjs [--verbose]
 * Падает с кодом 1, если найдено расхождение, не описанное в
 * docs/redesign/snapshots/allowlist.json.
 *
 * Почему не диф по последовательности. Редизайн намеренно переставляет секции
 * (прайс поднимается над «до/после», SEO-текст уходит под отзывы) и убирает
 * дубли прайса. Любой LCS покажет перенос блока как «пропало здесь, появилось
 * там», а дедупликацию — как потерю половины цен. Поэтому проверяем не порядок,
 * а наличие:
 *
 *   1. каждый заголовок H2 из before обязан остаться — так ловится пропажа
 *      целой секции, даже если её слова встречаются в других местах страницы;
 *   2. каждое слово из before обязано встретиться где-то в after — так ловится
 *      любая другая потеря текста, от абзаца SEO до одной цены в прайсе.
 *
 * Разрешения из allowlist сверяются с узким окном вокруг слова, а не со всем
 * абзацем: иначе широкий паттерн вроде «цена договорная» тихо разрешает
 * удаление соседних строк прайса.
 *
 * Секция pending — расхождения, по которым владелец ещё не принял решения:
 * они видны в отчёте, но не валят сборку.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const SNAP = "docs/redesign/snapshots";
const verbose = process.argv.includes("--verbose");

const allow = JSON.parse(readFileSync(path.join(SNAP, "allowlist.json"), "utf8"));
const removedRe = allow.removed.map((r) => new RegExp(r, "i"));
const addedRe = allow.added.map((r) => new RegExp(r, "i"));

const TRIM = /^[«»„“”"'()[\]{}.,;:!?…—–-]+|[«»„“”"'()[\]{}.,;:!?…—–-]+$/g;

const normalize = (word) => word.replace(TRIM, "");

function tokenSet(text) {
  const set = new Set();
  for (const raw of text.split(/\s+/)) {
    const w = normalize(raw);
    if (w) set.add(w);
  }
  return set;
}

/** Окно ±10 слов вокруг первого вхождения — и для отчёта, и для сверки с allowlist.
 *  Уже окно резало длинные разрешённые фразы пополам, шире — начинает прятать
 *  соседние потери под один паттерн. */
function contextOf(word, text) {
  const words = text.split(/\s+/);
  const at = words.findIndex((w) => normalize(w) === word);
  if (at < 0) return word;
  return words.slice(Math.max(0, at - 10), at + 11).join(" ");
}

const problems = [];
const notes = [];
const pending = [];

/** Расхождение, по которому владелец ещё не решил: показываем, но не валим. */
function pendingOf(url, value) {
  const entry = allow.pending?.[url];
  if (!entry) return null;
  return (entry.patterns ?? []).some((r) => new RegExp(r, "i").test(value)) ? entry.reason : null;
}

function compareField(url, field, before, after) {
  if (before === after) return;

  const edit = allow.meta?.[url]?.[field];
  if (edit && edit.from === before && edit.to === after) {
    notes.push(`${url} · ${field}: утверждённая правка «${before}» → «${after}»`);
    return;
  }

  const why = pendingOf(url, after);
  if (why) {
    pending.push(`${url} · ${field}: ${why}\n    было:  ${before}\n    стало: ${after}`);
    return;
  }

  problems.push(`${url} · ${field}\n    было:  ${before}\n    стало: ${after}`);
}

const beforeDir = path.join(SNAP, "before");
const afterDir = path.join(SNAP, "after");
for (const dir of [beforeDir, afterDir]) {
  if (!existsSync(dir)) {
    console.error(`Нет снапшота: ${dir}. Сначала node scripts/content-snapshot.mjs <before|after>`);
    process.exit(1);
  }
}

const files = readdirSync(beforeDir).filter((f) => f.endsWith(".json") && f !== "_index.json");
let compared = 0;

for (const file of files) {
  const b = JSON.parse(readFileSync(path.join(beforeDir, file), "utf8"));
  const afterPath = path.join(afterDir, file);
  if (!existsSync(afterPath)) {
    if (allow.droppedUrls?.includes(b.url)) {
      notes.push(`${b.url} · страница удалена намеренно (301)`);
      continue;
    }
    problems.push(`${b.url} · страница исчезла из sitemap/выдачи`);
    continue;
  }
  const a = JSON.parse(readFileSync(afterPath, "utf8"));
  compared++;

  compareField(b.url, "title", b.title, a.title);
  compareField(b.url, "description", b.description, a.description);
  compareField(b.url, "canonical", b.canonical, a.canonical);
  compareField(b.url, "h1", b.h1.join(" | "), a.h1.join(" | "));

  const lostLinks = b.links.filter((l) => !a.links.includes(l) && !allow.droppedUrls?.includes(l));
  if (lostLinks.length) problems.push(`${b.url} · пропала перелинковка: ${lostLinks.join(", ")}`);

  // Точечные правки данных, утверждённые владельцем, разрешаем только на своей
  // странице: глобальный паттерн замаскировал бы потерю той же строки на других.
  const edit = allow.textEdits?.[b.url];
  const localRemoved = (edit?.removed ?? []).map((r) => new RegExp(r, "i"));
  const localAdded = (edit?.added ?? []).map((r) => new RegExp(r, "i"));

  const okRemoved = (s) => localRemoved.some((re) => re.test(s)) || removedRe.some((re) => re.test(s));
  const okAdded = (s) => localAdded.some((re) => re.test(s)) || addedRe.some((re) => re.test(s));

  // 1. Заголовки секций
  const afterH2 = new Set(a.h2);
  for (const h of b.h2) {
    if (afterH2.has(h)) continue;
    if (okRemoved(h)) notes.push(`${b.url} · снята секция «${h}»`);
    else problems.push(`${b.url} · пропал заголовок секции «${h}»`);
  }
  const beforeH2 = new Set(b.h2);
  const markedText = a.newBlocksText ?? "";
  for (const h of a.h2) {
    if (beforeH2.has(h)) continue;
    if (okAdded(h) || markedText.includes(h)) {
      if (verbose) notes.push(`${b.url} · новая секция «${h}»`);
    } else problems.push(`${b.url} · появился заголовок секции «${h}»`);
  }

  // 2. Слова — основная проверка на потерю текста
  const beforeText = b.text;
  const afterText = a.text;
  const beforeTokens = tokenSet(beforeText);
  const afterTokens = tokenSet(afterText);

  for (const w of beforeTokens) {
    if (afterTokens.has(w)) continue;
    const ctx = contextOf(w, beforeText);
    if (okRemoved(w) || okRemoved(ctx)) {
      if (verbose) notes.push(`${b.url} · снято слово: ${w}`);
      continue;
    }
    const why = pendingOf(b.url, ctx);
    if (why) pending.push(`${b.url} · ${why}: пропало «${ctx}»`);
    else problems.push(`${b.url} · пропал текст «${w}»\n    контекст: ${ctx}`);
  }

  // Ответы FAQ в старом шаблоне дорисовывались скриптом, в разметке лежал только
  // первый. В новом они всегда в <details> — это перенос уже существующего
  // контента в разметку, а не новый текст.
  // Плюс блоки, помеченные data-gate-new: их появление предусмотрено ТЗ,
  // а причина записана прямо в разметке рядом с блоком.
  const faqTokens = tokenSet((a.faqText ?? "") + " " + (a.newBlocksText ?? ""));
  for (const w of afterTokens) {
    if (beforeTokens.has(w)) continue;
    if (faqTokens.has(w)) {
      if (verbose) notes.push(`${b.url} · ответ FAQ теперь в разметке: ${w}`);
      continue;
    }
    const ctx = contextOf(w, afterText);
    if (okAdded(w) || okAdded(ctx)) {
      if (verbose) notes.push(`${b.url} · добавлено слово: ${w}`);
      continue;
    }
    const why = pendingOf(b.url, ctx);
    if (why) pending.push(`${b.url} · ${why}: появилось «${ctx}»`);
    else problems.push(`${b.url} · появился текст «${w}»\n    контекст: ${ctx}`);
  }
}

const newUrls = readdirSync(afterDir)
  .filter((f) => f.endsWith(".json") && f !== "_index.json" && !existsSync(path.join(beforeDir, f)));
if (newUrls.length) notes.push(`Новые URL: ${newUrls.join(", ")}`);

console.log(`Сравнено страниц: ${compared}`);
if (notes.length) console.log("\nОжидаемые изменения:\n  " + notes.join("\n  "));
if (pending.length) console.log("\n⚠ Ждут решения владельца:\n  " + [...new Set(pending)].join("\n  "));
if (problems.length) {
  console.error(`\n❌ Нарушений правила 1:1 — ${problems.length}:\n\n  ` + problems.join("\n\n  "));
  process.exit(1);
}
console.log("\n✅ Дифф чистый: контент перенесён 1:1");
