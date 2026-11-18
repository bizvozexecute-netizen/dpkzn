import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { alarmLandings } from "@/lib/db/schema";

/**
 * CRUD посадочных сигнализаций (минимальная админка).
 * Доступ закрыт middleware (/api/admin/*). Списки и FAQ хранятся JSON-строками;
 * здесь проверяется, что это валидный JSON нужной формы.
 */

const jsonList = z.string().refine((v) => {
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) && p.every((s) => typeof s === "string");
  } catch {
    return false;
  }
}, "Ожидается JSON-массив строк");

const jsonFaq = z.string().refine((v) => {
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) && p.every((f) => f && typeof f.question === "string" && typeof f.answer === "string");
  } catch {
    return false;
  }
}, "Ожидается JSON-массив {question, answer}");

const landingSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "Слаг: латиница, цифры, дефис"),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  navLabel: z.string().min(1),
  metaTitle: z.string().min(1).max(60, "Title ≤ 60 символов"),
  metaDescription: z.string().min(1),
  h1: z.string().min(1),
  overline: z.string().nullable(),
  lead: z.string().min(1),
  offerPoints: jsonList,
  priceTitle: z.string(),
  includedTitle: z.string(),
  included: jsonList,
  faq: jsonFaq,
  formTitle: z.string(),
  formHint: z.string(),
  submitLabel: z.string(),
  teaser: z.string(),
});

export async function GET() {
  return NextResponse.json(db.select().from(alarmLandings).orderBy(asc(alarmLandings.sortOrder)).all());
}

/** Создание (без id) или обновление (с id) */
export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = landingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 });
  }
  const id = typeof body?.id === "number" ? body.id : null;
  try {
    if (id) db.update(alarmLandings).set(parsed.data).where(eq(alarmLandings.id, id)).run();
    else db.insert(alarmLandings).values(parsed.data).run();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Ошибка БД" }, { status: 400 });
  }
  return NextResponse.json(db.select().from(alarmLandings).orderBy(asc(alarmLandings.sortOrder)).all());
}

export async function DELETE(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "id" }, { status: 400 });
  db.delete(alarmLandings).where(eq(alarmLandings.id, id)).run();
  return NextResponse.json({ ok: true });
}
