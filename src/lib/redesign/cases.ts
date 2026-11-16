import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * Флагманские кейсы портфолио — развороты (03-template-portfolio.md).
 *
 * Контент живёт в docs/redesign/content/cases/*.md: фронтматтер с фактами и
 * фото, тело — секции «## Задача» / «## Процесс» / «## Результат». Разворот
 * собирается из файла без правок кода — новый кейс = новый markdown.
 *
 * Формат нарочно узкий (свои файлы, не пользовательский ввод): ключ: значение,
 * массивы [a, b] или списком «- пункт», абзацы через пустую строку. Парсер
 * без зависимостей — gray-matter ради шести файлов не нужен.
 */

const CASES_DIR = path.join(process.cwd(), "docs", "redesign", "content", "cases");

export interface CaseSection {
  heading: string;
  paragraphs: string[];
}

export interface CaseSpreadData {
  slug: string;
  car: string;
  title: string;
  services: string[];
  serviceLinks: string[];
  /** «[проверить: N дней]» до подтверждения владельцем — такой факт не показываем */
  duration: string;
  hero: string;
  photos: string[];
  sections: CaseSection[];
}

function parseList(value: string): string[] {
  return value
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseCase(slug: string, rawInput: string): CaseSpreadData | null {
  // Переводы строк Windows: git на Windows (autocrlf) выгружает файлы с CRLF,
  // и «\r» в конце строк ломал разбор — локально кейсы не рендерились вовсе,
  // хотя на проде (LF) работали. Локальная сборка и гейт должны видеть то же,
  // что прод.
  const raw = rawInput.replace(/\r\n?/g, "\n");
  const parts = raw.split(/^---\s*$/m);
  if (parts.length < 3) return null;
  const [, front, ...bodyParts] = parts;
  const body = bodyParts.join("---").trim();

  const meta: Record<string, string> = {};
  const lists: Record<string, string[]> = {};
  let listKey: string | null = null;
  for (const line of front.split("\n")) {
    const item = line.match(/^\s+-\s+(.+)$/);
    if (item && listKey) {
      (lists[listKey] ??= []).push(item[1].trim());
      continue;
    }
    const kv = line.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value === "") {
      listKey = key;
    } else {
      listKey = null;
      meta[key] = value.replace(/^"|"$/g, "");
    }
  }

  const sections: CaseSection[] = [];
  for (const chunk of body.split(/^##\s+/m)) {
    const text = chunk.trim();
    if (!text) continue;
    const [heading, ...rest] = text.split("\n");
    const paragraphs = rest
      .join("\n")
      .split(/\n\s*\n/)
      .map((p) => p.trim().replace(/\s*\n\s*/g, " "))
      .filter(Boolean);
    if (paragraphs.length) sections.push({ heading: heading.trim(), paragraphs });
  }

  if (!meta.car || sections.length === 0) return null;

  return {
    slug,
    car: meta.car,
    title: meta.title ?? meta.car,
    services: parseList(meta.services ?? ""),
    serviceLinks: parseList(meta.serviceLinks ?? ""),
    duration: meta.duration ?? "",
    hero: meta.hero ?? "",
    photos: lists.photos ?? [],
    sections,
  };
}

export function getCaseSpread(slug: string): CaseSpreadData | null {
  // Слаг приходит из URL — не даём ему выйти за пределы каталога кейсов
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const file = path.join(CASES_DIR, `${slug}.md`);
  if (!existsSync(file)) return null;
  return parseCase(slug, readFileSync(file, "utf8"));
}

export function getCaseSlugs(): string[] {
  if (!existsSync(CASES_DIR)) return [];
  return readdirSync(CASES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}
