import { gte } from "drizzle-orm";
import { leadsDb } from "@/lib/db/leads";
import { leads } from "@/lib/db/leads-schema";

/**
 * Сводка заявок из встроенной CRM (data/leads.db) для /admin/report:
 * сколько пришло за период и за такой же период до него, откуда, в каком
 * статусе, с каких страниц и по дням. Заявок сотни, агрегируем в JS —
 * это проще и читаемее пяти GROUP BY.
 *
 * Строки из Вебвизора (origin=webvisor) — восстановленные кандидаты без
 * номера, не живые обращения: считаются отдельной строкой, в общий счёт
 * периода не входят.
 */
const SOURCE_LABELS: Record<string, string> = {
  quiz: "Квиз",
  "anatomy-sheet": "Анатомия: карточка зоны",
  anatomy: "Анатомия: смета",
  "photo-estimate": "«Расчёт по фото»",
  callback: "«Перезвоните»",
  "exit-popup": "Экзит-попап",
  exit_popup: "Экзит-попап",
  cta: "Форма на странице",
  form: "Форма на странице",
  hero: "Форма в hero",
  contacts: "Страница контактов",
  // Формы захвата LeadForm (23.09.2026): источник — место на странице
  "hero:home": "Первый экран главной",
  "hero:service": "Первый экран услуги",
  "after-services": "После списка услуг",
  "after-portfolio": "После работ",
  "before-quiz": "Короткий путь над квизом",
  "page-bottom": "Низ страницы",
  "antikor-bridge": "Антикор → другие услуги",
  "anatomy-estimate": "Анатомия: смета",
};

/** Точное совпадение, иначе по префиксу до двоеточия: «quiz:home» → «Квиз» */
function sourceLabel(source: string | null): string {
  if (!source) return "Без источника";
  return SOURCE_LABELS[source] ?? SOURCE_LABELS[source.split(":")[0]] ?? source;
}

export interface LeadsReport {
  days: number;
  total: number;
  prevTotal: number;
  bySource: { label: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byPage: { page: string; count: number }[];
  daily: { date: string; count: number }[];
  webvisorCandidates: number;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function getLeadsReport(days: number): LeadsReport {
  const now = Date.now();
  const since = new Date(now - (days - 1) * 864e5);
  since.setUTCHours(0, 0, 0, 0);
  const prevSince = new Date(since.getTime() - days * 864e5);

  const rows = leadsDb.select().from(leads).where(gte(leads.createdAt, prevSince.toISOString())).all();

  const sinceIso = since.toISOString();
  const live = rows.filter((r) => r.origin !== "webvisor");
  const current = live.filter((r) => r.createdAt >= sinceIso);
  const previous = live.filter((r) => r.createdAt < sinceIso);

  const count = <T,>(items: T[], key: (item: T) => string) => {
    const map = new Map<string, number>();
    for (const it of items) {
      const k = key(it);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };

  const daily: { date: string; count: number }[] = [];
  const perDay = new Map(count(current, (r) => dayKey(r.createdAt)));
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 864e5);
    const k = d.toISOString().slice(0, 10);
    daily.push({ date: k, count: perDay.get(k) ?? 0 });
  }

  return {
    days,
    total: current.length,
    prevTotal: previous.length,
    bySource: count(current, (r) => sourceLabel(r.source)).map(([label, c]) => ({ label, count: c })),
    byStatus: count(current, (r) => r.status).map(([status, c]) => ({ status, count: c })),
    byPage: count(current, (r) => r.page || "/")
      .slice(0, 6)
      .map(([page, c]) => ({ page, count: c })),
    daily,
    webvisorCandidates: rows.filter((r) => r.origin === "webvisor" && r.createdAt >= sinceIso).length,
  };
}
