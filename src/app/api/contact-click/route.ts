import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { visitSchema } from "@/lib/visit-schema";
import { contactChannels } from "@/lib/contact-channels";
import { saveVisit } from "@/lib/db/funnel";
import { leadsDb } from "@/lib/db/leads";

const schema = z.object({ visit: visitSchema, code: z.string().regex(/^[A-F0-9]{10}$/),
  page: visitSchema.shape.landing, channel: z.enum(contactChannels) });

export async function POST(req: NextRequest) {
  if (req.headers.get("sec-fetch-site") === "cross-site" || !req.headers.get("content-type")?.startsWith("application/json")) return new NextResponse(null,{status:403});
  const text = await req.text();
  if (text.length > 3000) return new NextResponse(null,{status:413});
  const result = schema.safeParse(await Promise.resolve().then(()=>JSON.parse(text)).catch(()=>null));
  if (!result.success) return new NextResponse(null,{status:400});
  const {visit,page,code,channel} = result.data;
  leadsDb.$client.transaction(() => {
    saveVisit(visit);
    leadsDb.$client.prepare("INSERT INTO contact_touches(code,visit_id,page,channel,clicked_at) VALUES(?,?,?,?,?) ON CONFLICT(code) DO NOTHING")
      .run(code,visit.id,page,channel,new Date().toISOString());
  }).immediate();
  return new NextResponse(null,{status:204});
}
