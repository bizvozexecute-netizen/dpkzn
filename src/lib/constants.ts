// ===== BUSINESS DATA =====
export const PHONE = "+7 (919) 644-93-93";
export const PHONE_RAW = "79196449393";
export const WHATSAPP_URL = "https://wa.me/79196449393";
export const ADDRESS = "пр-т Хусаина Ямашева, 7к1, Казань";
/** Часы работы студии — единственный источник для сайта, сида и админки.
 *  08:00–18:00 подтверждено владельцем 01.09.2026. На боевом сайте сейчас
 *  10:00–20:00 — это единственное осознанное расхождение редизайна с текущим
 *  контентом, оно отмечено в allowlist гейта.
 *  Раньше та же строка лежала в семи файлах и разъезжалась между ними. */
export const HOURS_OPEN = 8;
export const HOURS_CLOSE = 18;
export const HOURS = `Ежедневно ${String(HOURS_OPEN).padStart(2, "0")}:00–${HOURS_CLOSE}:00`;
export const METRIKA_ID = "108387254";
/** Пиксель VK Ads (top-Mail.Ru). Пустая строка = пиксель не подключается вообще.
 *  ID берётся в кабинете VK Ads → Пиксели. Держим здесь, а не в настройках БД:
 *  `npm run build` пересоздаёт БД (db:seed чистит таблицу), поэтому правка через
 *  админку жила бы только до следующего деплоя; плюс ID нужен и клиенту, в analytics.ts. */
export const VK_PIXEL_ID = "";
export const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL || "";
