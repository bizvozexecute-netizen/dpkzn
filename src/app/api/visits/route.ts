import { NextRequest, NextResponse } from "next/server";
import { visitSchema } from "@/lib/visit-schema";
import { saveVisit } from "@/lib/db/funnel";

export async function POST(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site" || !request.headers.get("content-type")?.startsWith("application/json")) {
    return new NextResponse(null, { status: 403 });
  }
  const text = await request.text();
  if (text.length > 2400) return new NextResponse(null, { status: 413 });
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return new NextResponse(null, { status: 400 }); }
  const result = visitSchema.safeParse(raw);
  if (!result.success) return new NextResponse(null, { status: 400 });
  saveVisit(result.data);
  return new NextResponse(null, { status: 204 });
}
