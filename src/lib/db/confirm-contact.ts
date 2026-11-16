import { randomUUID } from "node:crypto";
import { leadsDb } from "./leads";
import { normalizePhone } from "../phone";
import { contactChannels } from "../contact-channels";

export function confirmContact(body: Record<string, unknown>) {
  const channel = String(body.contactChannel);
  if (!contactChannels.some(c=>c === channel)) return {error:"Выберите канал обращения"};
  const phone = normalizePhone(String(body.phone || ""));
  if (!/^\+[1-9]\d{10,14}$/.test(phone)) return {error:"Укажите полный номер клиента для объединения обращений"};
  const code = String(body.contactCode || "").trim().toUpperCase();
  const db = leadsDb.$client;
  return db.transaction(() => {
    const touch = code ? db.prepare("SELECT * FROM contact_touches WHERE code=?").get(code) as
      {lead_id:number|null; visit_id:string|null; page:string|null; channel:string} | undefined : undefined;
    if (code && (!touch || touch.channel !== channel)) return {error:"Код не найден для этого канала. Проверьте код или оставьте его пустым"};
    if (touch?.lead_id) {
      const lead = db.prepare("SELECT id,phone FROM leads WHERE id=?").get(touch.lead_id) as {id:number;phone:string}|undefined;
      if (lead) return lead.phone === phone ? {id:lead.id} : {error:"Этот код уже подтверждён для другого клиента"};
    }
    const now = new Date().toISOString();
    const existing = db.prepare("SELECT id FROM leads WHERE phone=? AND origin IN ('site','manual') ORDER BY created_at DESC,id DESC LIMIT 1").get(phone) as {id:number}|undefined;
    const id = existing?.id ?? Number(db.prepare(`INSERT INTO leads(created_at,updated_at,status,origin,phone,name,service,channel,source,page,visit_id,manager_note)
      VALUES(?,?,'new','manual',?,?,?,?,?,?,?,?)`).run(now,now,phone,String(body.name||"")||null,String(body.service||"")||null,channel,"Подтверждённое обращение",touch?.page||null,touch?.visit_id||null,String(body.managerNote||"")||null).lastInsertRowid);
    if (code) db.prepare("UPDATE contact_touches SET lead_id=?,confirmed_at=? WHERE code=?").run(id,now,code);
    else db.prepare("INSERT INTO contact_touches(code,channel,lead_id,confirmed_at) VALUES(?,?,?,?)").run(randomUUID(),channel,id,now);
    if (existing && (body.managerNote || body.service || body.name)) {
      const note = [channel,body.name,body.service,body.managerNote].filter(Boolean).join(" · ");
      db.prepare("UPDATE leads SET manager_note=trim(coalesce(manager_note,'') || char(10) || ?),updated_at=? WHERE id=?").run(note,now,id);
    }
    return {id};
  }).immediate();
}
