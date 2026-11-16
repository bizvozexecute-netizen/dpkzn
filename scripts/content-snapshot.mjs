/**
 * Снимок текстового содержимого всех страниц сайта — доказательная база «SEO 1:1».
 *
 * Запуск:  node scripts/content-snapshot.mjs before   (на текущем сайте, до редизайна)
 *          node scripts/content-snapshot.mjs after    (на новом шаблоне)
 * Сервер:  npm run build && npx next start -p 3100  (или BASE_URL=... для другого адреса)
 *
 * Снимаем только <main>: шапка и футер редизайном меняются намеренно, а всё, что
 * покрыто правилом 1:1 (H1, тексты, прайс, FAQ, SEO-текст, перелинковка), живёт
 * внутри main. Сравнение — scripts/content-diff.mjs.
 */

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";

const label = process.argv[2];
if (!["before", "after"].includes(label)) {
  console.error("Использование: node scripts/content-snapshot.mjs <before|after>");
  process.exit(1);
}

const BASE = process.env.BASE_URL || "http://localhost:3100";
const OUT_DIR = path.join("docs/redesign/snapshots", label);

const ENTITIES = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  laquo: "«", raquo: "»", mdash: "—", ndash: "–", hellip: "…", rsquo: "’", deg: "°",
};

function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/** Видимый текст: убираем не-контентные узлы, теги → пробелы, схлопываем пробелы. */
function visibleText(html) {
  return decode(
    html
      .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function attr(html, re) {
  const m = html.match(re);
  return m ? decode(m[1]).trim() : null;
}

/** Содержимое всех блоков тега — разбором по строкам, без регулярок с экранированием. */
function innerBlocks(html, tag) {
  return html
    .split(`<${tag}`)
    .slice(1)
    .map((chunk) => chunk.slice(chunk.indexOf(">") + 1).split(`</${tag}>`)[0]);
}


/**
 * Текст блоков, помеченных data-gate-new.
 *
 * Так помечаются секции, которых на старой странице не было в разметке, хотя
 * контент существовал: отзывы и портфолио на главной дорисовывались скриптом,
 * ответы FAQ раскрывались по клику. Атрибут ставится прямо у блока вместе с
 * причиной — это и есть запись о том, что появление текста согласовано.
 */
function markedBlocks(html) {
  const out = [];
  let from = 0;
  for (;;) {
    const at = html.indexOf("data-gate-new", from);
    if (at < 0) break;
    const open = html.lastIndexOf("<", at);
    const tag = html.slice(open + 1).match(/^[a-zA-Z0-9-]+/)?.[0];
    if (!tag) { from = at + 1; continue; }

    const openEnd = html.indexOf(">", at);
    let depth = 1;
    let cursor = openEnd + 1;
    while (depth > 0 && cursor < html.length) {
      const nextOpen = html.indexOf("<" + tag, cursor);
      const nextClose = html.indexOf("</" + tag, cursor);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) { depth++; cursor = nextOpen + tag.length + 1; }
      else { depth--; cursor = nextClose + tag.length + 3; }
    }
    out.push(visibleText(html.slice(openEnd + 1, cursor)));
    from = cursor;
  }
  return out.join(" ");
}

function extract(url, html) {
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const main = mainMatch ? mainMatch[1] : html;

  const h1 = innerBlocks(main, "h1").map(visibleText);
  const h2 = innerBlocks(main, "h2").map(visibleText);
  const links = [...main.matchAll(/<a\b[^>]*href="([^"]+)"/gi)]
    .map((m) => decode(m[1]))
    .filter((h) => h.startsWith("/"))
    .filter((h, i, a) => a.indexOf(h) === i)
    .sort();
  const jsonLd = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => {
      try { return JSON.parse(m[1])["@type"]; } catch { return "unparsed"; }
    });

  // Ответы FAQ в старом шаблоне дорисовывались скриптом: в разметке лежал только
  // первый. Новый шаблон держит их в <details> всегда — снимаем отдельно, иначе
  // сравнение сочтёт перенос уже существующего контента «новым текстом».
  const faqText = innerBlocks(main, "details").map(visibleText).join(" ");

  // Блоки, появление которых предусмотрено ТЗ и помечено в разметке
  const newBlocksText = markedBlocks(main);

  return {
    url,
    title: attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description: attr(html, /<meta\s+name="description"\s+content="([^"]*)"/i),
    canonical: attr(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i),
    robots: attr(html, /<meta\s+name="robots"\s+content="([^"]*)"/i),
    jsonLd,
    h1,
    h2,
    links,
    faqText,
    newBlocksText,
    text: visibleText(main),
  };
}

const fileName = (url) => (url === "/" ? "_home" : url.replace(/^\//, "").replace(/\//g, "__")) + ".json";

async function main() {
  const sitemapXml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname)
    .filter((u, i, a) => a.indexOf(u) === i)
    .sort();

  if (urls.length === 0) throw new Error("sitemap.xml пуст — сервер поднят не тот?");

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  let ok = 0;
  const failures = [];
  for (const url of urls) {
    const res = await fetch(BASE + url);
    if (!res.ok) {
      failures.push(`${url} → ${res.status}`);
      continue;
    }
    const data = extract(url, await res.text());
    writeFileSync(path.join(OUT_DIR, fileName(url)), JSON.stringify(data, null, 2) + "\n");
    ok++;
  }

  writeFileSync(
    path.join(OUT_DIR, "_index.json"),
    JSON.stringify({ label, base: BASE, takenAt: new Date().toISOString(), urls }, null, 2) + "\n"
  );

  console.log(`Снято страниц: ${ok}/${urls.length} → ${OUT_DIR}`);
  if (failures.length) {
    console.error("Не открылись:\n  " + failures.join("\n  "));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
