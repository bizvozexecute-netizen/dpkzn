/**
 * Вспомогательные вычисления блога (03-template-blog.md).
 *
 * Всё работает поверх готового HTML статьи из БД и не меняет его текст:
 * правило «SEO 1:1» — в заголовки добавляются только якорные id.
 */

/** Категория статьи → страница услуги для CTA-компакта (ТЗ блога §4). */
export const CATEGORY_SERVICE: Record<string, string> = {
  "Защита кузова": "/ppf",
  Полировка: "/polirovka",
  "Тюнинг оптики": "/ustanovka-linz",
  Тонировка: "/tonirovka",
  "Уход за салоном": "/himchistka",
  Шумоизоляция: "/shumoizolyaciya",
  Детейлинг: "/detayling-kuzova",
  "Оклейка и плёнки": "/oklejka-avto",
  Стайлинг: "/antihrom",
};

const stripTags = (html: string) => html.replace(/<[^>]+>/g, " ");

/** Время чтения из объёма текста: ~180 слов в минуту, минимум 1. */
export function readingMinutes(html: string): number {
  const words = stripTags(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

export interface TocItem {
  id: string;
  label: string;
}

/**
 * Якоря для оглавления: каждому H2 присваивается порядковый id.
 * Оглавление показывается только при 4+ заголовках (ТЗ блога §2).
 */
export function withAnchors(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const out = html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (match, attrs, inner) => {
    const id = `razdel-${toc.length + 1}`;
    toc.push({ id, label: stripTags(inner).replace(/\s+/g, " ").trim() });
    return `<h2 id="${id}"${attrs ?? ""}>${inner}</h2>`;
  });
  return { html: out, toc };
}
