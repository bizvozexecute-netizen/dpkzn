import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { leadsDb } from "@/lib/db/leads";
import { LEAD_STATUSES, leads } from "@/lib/db/leads-schema";
import { normalizePhone } from "@/lib/phone";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [lead] = leadsDb.select().from(leads).where(eq(leads.id, Number(id))).all();
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const contacts = leadsDb.$client.prepare(`SELECT t.code,t.channel,t.confirmed_at AS confirmedAt,t.page,v.landing,v.source,v.medium,v.campaign
    FROM contact_touches t JOIN leads l ON l.id=t.lead_id LEFT JOIN funnel_visits v ON v.id=t.visit_id
    WHERE l.id=? OR (l.phone=? AND l.phone!='') ORDER BY t.confirmed_at DESC`).all(lead.id,lead.phone);
  return NextResponse.json({...lead,contacts});
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  // Белый список редактируемых полей — остальное живёт как пришло с сайта
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (typeof body.status === "string" && (LEAD_STATUSES as readonly string[]).includes(body.status)) {
    patch.status = body.status;
  }
  if (typeof body.phone === "string") patch.phone = normalizePhone(body.phone);
  if (typeof body.name === "string") patch.name = body.name || null;
  if (typeof body.managerNote === "string") patch.managerNote = body.managerNote || null;
  if (typeof body.service === "string") patch.service = body.service || null;
  if (typeof body.carClass === "string") patch.carClass = body.carClass || null;
  if (typeof body.carBrand === "string") patch.carBrand = body.carBrand || null;

  const [updated] = leadsDb
    .update(leads)
    .set(patch)
    .where(eq(leads.id, Number(id)))
    .returning()
    .all();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  leadsDb.delete(leads).where(eq(leads.id, Number(id))).run();
  return NextResponse.json({ success: true });
}
