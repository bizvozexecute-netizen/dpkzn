import { readSubmission, savePhotos, removePhotos, type LeadPhoto } from "@/lib/lead-photos";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appendFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { sendTelegramMessage } from "@/lib/telegram";
import { leads } from "@/lib/db/leads-schema";
import { eq } from "drizzle-orm";
import { normalizePhone } from "@/lib/phone";

import { visitSchema } from "@/lib/visit-schema";

const submitSchema = z.object({
  phone: z
    .string()
    .min(1, "Введите номер телефона").max(64, "Введите корректный номер телефона")
    .transform((val) => {
      let digits = val.replace(/\D/g, "");
      if (digits.length === 10) digits = "7" + digits;
      if (digits.startsWith("8") && digits.length === 11) digits = "7" + digits.slice(1);
      return "+" + digits;
    })
    .refine(
      (val) => /^\+[1-9]\d{10,14}$/.test(val),
      "Введите корректный номер телефона"
    ),
  visit: visitSchema.optional().catch(undefined),
  name: z.string().optional(),
  carClass: z.string().optional(),
  carBrand: z.string().optional(),
  service: z.string().optional(),
  services: z.array(z.string()).optional(),
  urgency: z.string().optional(),
  // Канал ответа из квиза (WhatsApp/Telegram/Max/Звонок). Без явного поля Zod
  // вырезал бы его молча, и мастер не знал бы, куда писать клиенту.
  channel: z.string().optional(),
  source: z.string().optional(),
  /** Поле-ловушка LeadForm: невидимо человеку, бот его заполняет */
  website: z.string().optional(),
  /** Время от появления формы до отправки — шлётся, только если меньше порога */
  elapsedMs: z.number().optional(),
  page: z.string().optional(),
  timestamp: z.string().optional(),
  utm: z
    .object({
      utm_source: z.string().optional(),
      utm_medium: z.string().optional(),
      utm_campaign: z.string().optional(),
      utm_content: z.string().optional(),
      utm_term: z.string().optional(),
      // Идентификаторы клика: yclid — Директ, vk_aid/rb_clickid — VK Ads.
      yclid: z.string().optional(),
      vk_aid: z.string().optional(),
      rb_clickid: z.string().optional(),
    })
    .optional(),
  // Первое касание — считается на клиенте в src/lib/attribution.ts.
  // Zod вырезает незнакомые поля, поэтому без этого блока данные не дойдут и до CRM.
  attribution: z
    .object({
      first_utm_source: z.string().optional(),
      first_utm_medium: z.string().optional(),
      first_utm_campaign: z.string().optional(),
      first_utm_content: z.string().optional(),
      first_referrer: z.string().optional(),
      first_landing: z.string().optional(),
      first_ts: z.string().optional(),
      touch_source: z.string().optional(),
    })
    .optional(),
});

type SubmitBody = z.infer<typeof submitSchema>;

/**
 * Строка о первом касании — показываем, только если оно отличается от текущего.
 * Нужна для Авито: переход из профиля часто идёт без меток, но реферер выдаёт площадку.
 */
function firstTouchLine(body: SubmitBody): string {
  const a = body.attribution;
  if (!a) return "";
  const source = a.first_utm_source || (a.first_referrer ? hostOf(a.first_referrer) : "");
  if (!source) return "";
  if (a.touch_source === "url" && source === body.utm?.utm_source) return "";
  return `🌐 Первый визит: ${source}${a.first_landing ? ` → ${a.first_landing}` : ""}`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const photoRequests = new Map<string, {count:number;until:number}>();
export async function POST(request: NextRequest) {
  if(request.headers.get("content-type")?.includes("multipart/form-data")){
    const now=Date.now();
    for(const [key,value] of photoRequests) if(value.until<now)photoRequests.delete(key);
    const key=request.headers.get("x-real-ip")||"unknown";
    const entry=photoRequests.get(key)||{count:0,until:now+60000};
    if(entry.count>=6||photoRequests.size>10000)return NextResponse.json({error:"Слишком много отправок. Подождите минуту."},{status:429});
    entry.count++;photoRequests.set(key,entry);
  }
  let photos: LeadPhoto[] = [];
  let persisted = false;
  try {
    const {raw,files} = await readSubmission(request);
    const result = submitSchema.safeParse(raw);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const body: SubmitBody & {photos?: LeadPhoto[]} = result.data;

    // Ловушки LeadForm. Отвечаем успехом, чтобы бот не подбирал обход, но в
    // Telegram, CRM и журнал заявка не попадает. Старые формы этих полей не
    // шлют — проверка их не касается.
    if (body.website || body.elapsedMs !== undefined) {
      console.warn(`[submit] отброшено ловушкой: source=${body.source} website=${Boolean(body.website)} elapsed=${body.elapsedMs}`);
      return NextResponse.json({ success: true });
    }

    photos = await savePhotos(files);
    body.photos = photos;
    // Save before contacting external services; either store can recover the lead.
    const now = new Date().toISOString();
    const journalLine = JSON.stringify({ receivedAt: now, tgOk: null, crmOk: null, lead: body });
    const dedupeKey = createHash("sha256").update(journalLine).digest("hex");
    let journalSaved = false;
    let dbSaved = false;
    try {
      const dir = process.env.LEADS_DATA_DIR || path.join(process.cwd(), "data");
      mkdirSync(dir, { recursive: true });
      appendFileSync(path.join(dir, "leads.jsonl"), journalLine + "\n");
      journalSaved = true;
    } catch (e) {
      console.error("Lead journal error:", e);
    }
    try {
      const { leadsDb } = await import("@/lib/db/leads");
      if (body.visit) {
        const { saveVisit } = await import("@/lib/db/funnel");
        saveVisit(body.visit);
      }
      leadsDb
        .insert(leads)
        .values({
          visitId: body.visit?.id,
          createdAt: now,
          updatedAt: now,
          status: "new",
          origin: "site",
          phone: normalizePhone(body.phone),
          name: body.name ?? null,
          carClass: body.carClass ?? null,
          carBrand: body.carBrand ?? null,
          service: body.service ?? null,
          servicesJson: body.services?.length ? JSON.stringify(body.services) : null,
          photosJson: photos.length ? JSON.stringify(photos) : null,
          urgency: body.urgency ?? null,
          channel: body.channel ?? null,
          source: body.source ?? null,
          page: body.page ?? null,
          clientTimestamp: body.timestamp ?? null,
          utmSource: body.utm?.utm_source ?? null,
          utmMedium: body.utm?.utm_medium ?? null,
          utmCampaign: body.utm?.utm_campaign ?? null,
          utmContent: body.utm?.utm_content ?? null,
          utmTerm: body.utm?.utm_term ?? null,
          yclid: body.utm?.yclid ?? null,
          vkAid: body.utm?.vk_aid ?? null,
          rbClickid: body.utm?.rb_clickid ?? null,
          attributionJson: body.attribution ? JSON.stringify(body.attribution) : null,
          tgOk: null,
          crmOk: null,
          dedupeKey,
        })
        .onConflictDoNothing()
        .run();
      dbSaved = true;
    } catch (e) {
      console.error("Lead CRM insert error:", e);
    }
    persisted = journalSaved || dbSaved;
    if (!persisted) {
      await removePhotos(photos);
      return NextResponse.json({ error: "Не удалось сохранить заявку. Попробуйте ещё раз или позвоните нам." }, { status: 503 });
    }

    let tgOk = false;
    let crmOk = false;

    // Send to CRM webhook
    const crmUrl = process.env.CRM_WEBHOOK_URL;
    if (crmUrl) {
      try {
        const response = await fetch(crmUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10000),
        });
        crmOk = response.ok;
        if (!response.ok) console.error("CRM webhook HTTP error:", response.status);
      } catch (e) {
        console.error("CRM webhook error:", e);
      }
    }

    // Send to Telegram (optional)
    const tgToken = process.env.TG_BOT_TOKEN;
    const tgChat = process.env.TG_CHAT_ID;
    if (tgToken && tgChat) {
      const text = [
        "📋 Новая заявка с сайта",
        `📱 Телефон: ${body.phone}`,
        body.name ? `👤 Имя: ${body.name}` : "",
        body.carClass ? `🚗 Класс: ${body.carClass}` : "",
        body.carBrand ? `🚗 Марка: ${body.carBrand}` : "",
        body.service ? `🔧 Услуга: ${body.service}` : "",
        body.services?.length ? `🔧 Услуги: ${body.services.join(", ")}` : "",
        body.urgency ? `⏰ Срочность: ${body.urgency}` : "",
        body.channel ? `💬 Канал: ${body.channel}` : "",
        body.source ? `📍 Источник: ${body.source}` : "",
        body.page ? `📄 Страница: ${body.page}` : "",
        ...photos.map((p,i)=>`📷 Фото ${i+1} (вход для студии): https://dpkzn.ru${p.url}`),
        body.utm?.utm_source || body.utm?.utm_medium || body.utm?.utm_campaign
          ? `📊 UTM: ${body.utm.utm_source || "—"} / ${body.utm.utm_medium || "—"} / ${body.utm.utm_campaign || "—"}`
          : "",
        // Креатив VK и объявление Авито приходят именно здесь — без этих строк
        // невозможно понять, какое объявление принесло заявку.
        body.utm?.utm_content ? `🎯 Креатив: ${body.utm.utm_content}` : "",
        body.utm?.utm_term ? `🔑 Запрос: ${body.utm.utm_term}` : "",
        body.utm?.yclid ? `🆔 yclid: ${body.utm.yclid}` : "",
        firstTouchLine(body),
      ]
        .filter(Boolean)
        .join("\n");

      // parse_mode намеренно не передаётся: HTML-тегов в тексте нет, а экранирования
      // в sendTelegramMessage тоже нет — любая угловая скобка или & из utm_content
      // ломала бы отправку с 400, и уведомление о заявке терялось бы молча.
      try {
        const tgResult = await sendTelegramMessage(tgToken, { chatId: tgChat, text });
        tgOk = tgResult.ok;
        if (!tgResult.ok) console.error("Telegram error:", tgResult.status, tgResult.error);
      } catch (e) {
        console.error("Telegram error:", e);
      }
    } else {
      console.warn("Telegram not configured: TG_BOT_TOKEN or TG_CHAT_ID missing");
    }

    if (dbSaved) {
      try {
        const { leadsDb } = await import("@/lib/db/leads");
        leadsDb.update(leads).set({ tgOk, crmOk, updatedAt: new Date().toISOString() })
          .where(eq(leads.dedupeKey, dedupeKey)).run();
      } catch (e) {
        console.error("Lead delivery status update error:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (!persisted) await removePhotos(photos);
    return NextResponse.json(
      { error: error instanceof Error && /фото|Фото|JPG|запрос/.test(error.message) ? error.message : "Не удалось обработать заявку. Проверьте данные и фото." },
      { status: 400 }
    );
  }
}
