import { getAllServices } from "@/lib/db/queries/services";
import type { ServiceData, ServicePackage } from "@/lib/types";

/**
 * YML-фид (Yandex Market Language) для витрины «Товары и услуги» Яндекс Бизнеса.
 *
 * Подключается в кабинете: О компании → Товары и услуги → Источник → YML-фид,
 * ссылка https://dpkzn.ru/yml. Яндекс забирает фид сам и перезаписывает витрину
 * целиком, поэтому прайс в карточке всегда совпадает с БД сайта.
 *
 * Ограничения Яндекса, которые здесь соблюдаются:
 * - обязательные поля: category/categoryId, name, vendor, offer id, price, currencyId;
 * - цена только точная, диапазон нельзя; позиция без цены не публикуется;
 * - в текстах запрещены телефоны и ссылки;
 * - picture — прямая ссылка на JPG/PNG (webp Яндекс не читает),
 *   картинки готовит scripts/build-feed-images.mjs;
 * - до 10 000 позиций и 15 МБ на фид.
 */

const DOMAIN = "https://dpkzn.ru";
const VENDOR = "Detailing Place";
const CURRENCY = "RUB";

/** Витрина публикуется с разбивкой по этим категориям — как у конкурентов. */
const CATEGORIES: { id: number; title: string; slugs: string[] }[] = [
  { id: 1, title: "Полировка и керамика", slugs: ["polirovka", "zashchitnye-pokrytiya"] },
  { id: 2, title: "Химчистка и шумоизоляция", slugs: ["himchistka", "shumoizolyaciya"] },
  {
    id: 3,
    title: "Оптика и стёкла",
    slugs: ["ustanovka-linz", "regulirovka-far", "polirovka-far", "polirovka-stekol", "antidozhd", "tonirovka"],
  },
  { id: 4, title: "Плёнки и защита кузова", slugs: ["ppf", "broneplenka"] },
  { id: 5, title: "Кузов и стайлинг", slugs: ["antihrom", "remont-vmyatin", "detayling-kuzova", "oklejka-avto"] },
  {
    id: 6,
    title: "Антикор, сигнализации, выезд",
    slugs: ["antikor", "ustanovka-signalizacii", "vyezdnoj-detayling"],
  },
];

const CATEGORY_BY_SLUG = new Map(
  CATEGORIES.flatMap((c) => c.slugs.map((slug) => [slug, c.id] as const))
);

/** Аббревиатуры, которые нельзя ломать при переводе ИЗ КАПСА в обычный регистр. */
const KEEP_UPPER: Record<string, string> = {
  ppf: "PPF",
  gsm: "GSM",
  pdr: "PDR",
  "9h": "9H",
  "bi-led": "Bi-LED",
};

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Названия пакетов в БД записаны капсом («КОМПЛЕКС 1», «ПОЛИРОВКА + КЕРАМИКА 9H»).
 * В витрине это выглядит криком — приводим к обычному регистру, сохраняя аббревиатуры.
 */
function humanizePackageName(name: string): string {
  const lower = name.toLocaleLowerCase("ru");
  const restored = lower.replace(
    /\b(ppf|gsm|pdr|9h|bi-led)\b/g,
    (m) => KEEP_UPPER[m] ?? m
  );
  return restored.charAt(0).toLocaleUpperCase("ru") + restored.slice(1);
}

/** «Антигравийная плёнка (PPF) в Казани» → «Антигравийная плёнка (PPF)» */
function cleanTitle(h1: string): string {
  return h1.replace(/\s+в\s+Казани.*$/i, "").trim();
}

/**
 * Первая распознаваемая цена по классам авто (класс 1 — минимальная).
 * «50 000₽» → 50000, «от 180 000₽» → 180000, «Дог.» → null (позиция не публикуется).
 */
function parsePrice(classPrices: (string | null)[]): number | null {
  for (const raw of classPrices) {
    if (!raw) continue;
    const match = raw.match(/\d[\d\s ]*/);
    if (!match) continue;
    const digits = match[0].replace(/[\s ]/g, "");
    const value = Number.parseInt(digits, 10);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

/** Яндекс запрещает телефоны и ссылки в описаниях. */
function sanitizeText(s: string): string {
  return s
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\bwww\.\S+/gi, "")
    .replace(/[+]?\d[\d\s()-]{9,}\d/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function truncate(s: string, limit: number): string {
  if (s.length <= limit) return s;
  return s.slice(0, limit - 1).trimEnd() + "…";
}

function buildOffer(service: ServiceData, pkg: ServicePackage, index: number): string | null {
  const price = parsePrice(pkg.classPrices);
  if (price === null) return null;

  const categoryId = CATEGORY_BY_SLUG.get(service.slug);
  if (categoryId === undefined) return null;

  const base = cleanTitle(service.h1);
  const name =
    service.packages.length > 1 ? `${base} — ${humanizePackageName(pkg.name)}` : base;

  const details = [pkg.description, ...pkg.features].filter(Boolean).join(". ");
  const description = truncate(
    sanitizeText(`${service.subtitle}. ${details}`),
    3000
  );
  const shortDescription = truncate(
    sanitizeText(`Цена указана от, за 1-й класс авто. ${pkg.description}`),
    250
  );

  return [
    `    <offer id="${xmlEscape(`${service.slug}-${index + 1}`)}" available="true">`,
    `      <name>${xmlEscape(truncate(name, 250))}</name>`,
    `      <vendor>${xmlEscape(VENDOR)}</vendor>`,
    `      <price>${price}</price>`,
    `      <currencyId>${CURRENCY}</currencyId>`,
    `      <categoryId>${categoryId}</categoryId>`,
    `      <picture>${DOMAIN}/images/feed/${service.slug}.jpg</picture>`,
    `      <url>${DOMAIN}${service.url}</url>`,
    `      <shortDescription>${xmlEscape(shortDescription)}</shortDescription>`,
    `      <description>${xmlEscape(description)}</description>`,
    `    </offer>`,
  ].join("\n");
}

export const revalidate = 3600;

export function GET(): Response {
  const services = getAllServices();

  const offers = services
    .flatMap((service) => service.packages.map((pkg, i) => buildOffer(service, pkg, i)))
    .filter((o): o is string => o !== null);

  const categories = CATEGORIES.map(
    (c) => `    <category id="${c.id}">${xmlEscape(c.title)}</category>`
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${new Date().toISOString().slice(0, 19).replace("T", " ")}">
  <shop>
    <name>${xmlEscape(VENDOR)}</name>
    <company>${xmlEscape(VENDOR)}</company>
    <url>${DOMAIN}</url>
    <currencies>
      <currency id="${CURRENCY}" rate="1"/>
    </currencies>
    <categories>
${categories}
    </categories>
    <offers>
${offers.join("\n")}
    </offers>
  </shop>
</yml_catalog>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
