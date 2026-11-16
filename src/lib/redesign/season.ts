import type { SeasonalOfferData } from "@/lib/types";

/**
 * Сезонная кампания (владелец 03.09: «сентябрь — сезон оклейки зон риска,
 * написать везде и сделать как акцию»).
 *
 * Тексты, скидка и дата живут в БД (seasonal_offer, правится из админки);
 * здесь — то, что к тексту не относится: какие зоны анатомии считаются
 * «зонами риска» и куда ведёт расчёт. Зоны риска — устойчивое понятие
 * рынка PPF: передняя проекция машины, которую первой бьёт гравий.
 */
export const RISK_ZONES = ["hood", "front_bumper", "headlights", "front_fenders"] as const;

export const SEASON_HREF = "/ppf";

/** Сезон активен: флаг в БД и дата ещё не прошла */
export function seasonIsLive(offer: SeasonalOfferData | null | undefined, now = new Date()): offer is SeasonalOfferData {
  if (!offer || !offer.isActive) return false;
  const end = new Date(offer.endDate);
  return !Number.isNaN(end.getTime()) && end.getTime() > now.getTime();
}

const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/** «до 30 сентября» — без года, если он текущий */
export function seasonUntil(endDate: string, now = new Date()): string {
  const d = new Date(endDate);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear() === now.getFullYear() ? "" : ` ${d.getFullYear()}`;
  return `до ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}${year}`;
}

/** Короткая строка выгоды для чипов и панели: «−10% до 30 сентября» */
export function seasonBenefit(offer: SeasonalOfferData): string {
  const until = seasonUntil(offer.endDate);
  return offer.discount > 0 ? `−${offer.discount}% ${until}`.trim() : until;
}
