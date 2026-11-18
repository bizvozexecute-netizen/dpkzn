import { asc, eq } from "drizzle-orm";
import { db } from "../index";
import { alarmLandings } from "../schema";

/** Услуга-хаб, из которой посадочные берут прайс, этапы, кейсы и отзывы */
export const ALARM_HUB_SLUG = "ustanovka-signalizacii";
export const ALARM_HUB_URL = "/" + ALARM_HUB_SLUG;

export interface AlarmFaq {
  question: string;
  answer: string;
}

export interface AlarmLanding {
  slug: string;
  url: string;
  sortOrder: number;
  navLabel: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  overline: string | null;
  lead: string;
  offerPoints: string[];
  priceTitle: string;
  includedTitle: string;
  included: string[];
  faq: AlarmFaq[];
  formTitle: string;
  formHint: string;
  submitLabel: string;
  teaser: string;
}

function parseList(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && s.trim() !== "") : [];
  } catch {
    return [];
  }
}

function parseFaq(raw: string): AlarmFaq[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v)
      ? v.filter((f): f is AlarmFaq => !!f && typeof f.question === "string" && typeof f.answer === "string" && f.question.trim() !== "")
      : [];
  } catch {
    return [];
  }
}

type Row = typeof alarmLandings.$inferSelect;

function toLanding(r: Row): AlarmLanding {
  return {
    slug: r.slug,
    url: `${ALARM_HUB_URL}/${r.slug}`,
    sortOrder: r.sortOrder,
    navLabel: r.navLabel,
    metaTitle: r.metaTitle,
    metaDescription: r.metaDescription,
    h1: r.h1,
    overline: r.overline,
    lead: r.lead,
    offerPoints: parseList(r.offerPoints),
    priceTitle: r.priceTitle,
    includedTitle: r.includedTitle,
    included: parseList(r.included),
    faq: parseFaq(r.faq),
    formTitle: r.formTitle,
    formHint: r.formHint,
    submitLabel: r.submitLabel,
    teaser: r.teaser,
  };
}

/** Активная посадочная по слагу; таблицы нет (миграция не применена) — undefined */
export function getAlarmLanding(slug: string): AlarmLanding | undefined {
  try {
    const row = db.select().from(alarmLandings).where(eq(alarmLandings.slug, slug)).get();
    return row && row.isActive ? toLanding(row) : undefined;
  } catch {
    return undefined;
  }
}

/** Все активные посадочные — для хаба, sitemap, мегаменю и блога */
export function getAlarmLandings(): AlarmLanding[] {
  try {
    return db
      .select()
      .from(alarmLandings)
      .where(eq(alarmLandings.isActive, true))
      .orderBy(asc(alarmLandings.sortOrder))
      .all()
      .map(toLanding);
  } catch {
    return [];
  }
}
