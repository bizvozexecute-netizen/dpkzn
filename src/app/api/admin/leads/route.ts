import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { leadsDb } from "@/lib/db/leads";
import { LEAD_STATUSES, leads } from "@/lib/db/leads-schema";
import { confirmContact } from "@/lib/db/confirm-contact";
import { normalizePhone } from "@/lib/phone";

/** Список заявок микро-CRM (+ фильтр по статусу) и ручное создание. */

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  const base = leadsDb.select().from(leads);
  const rows =
    status && (LEAD_STATUSES as readonly string[]).includes(status)
      ? base.where(eq(leads.status, status)).orderBy(desc(leads.createdAt)).limit(500).all()
      : base.orderBy(desc(leads.createdAt)).limit(500).all();
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (body.contactChannel) {
    const result = confirmContact(body);
    return NextResponse.json(result,{status:"error" in result ? 400 : 200});
  }
  const now = new Date().toISOString();
  const [created] = leadsDb
    .insert(leads)
    .values({
      createdAt: now,
      updatedAt: now,
      status: (LEAD_STATUSES as readonly string[]).includes(body.status) ? body.status : "new",
      origin: "manual",
      phone: body.phone ? normalizePhone(body.phone) : null,
      name: body.name || null,
      service: body.service || null,
      carClass: body.carClass || null,
      carBrand: body.carBrand || null,
      page: body.page || null,
      source: body.source || "вручную",
      managerNote: body.managerNote || null,
    })
    .returning()
    .all();
  return NextResponse.json(created, { status: 201 });
}
