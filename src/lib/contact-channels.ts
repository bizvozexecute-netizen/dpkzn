export const contactChannels = ["Звонок", "WhatsApp", "Telegram", "MAX"] as const;
export type ContactChannel = typeof contactChannels[number];

export function contactChannel(url: URL): ContactChannel | undefined {
  if (url.protocol === "tel:") return "Звонок";
  if (url.protocol !== "https:") return;
  const host = url.hostname.toLowerCase();
  if (["wa.me","api.whatsapp.com","web.whatsapp.com"].includes(host)) return "WhatsApp";
  if (host === "t.me" || host === "telegram.me") return "Telegram";
  if (host === "max.ru") return "MAX";
}
