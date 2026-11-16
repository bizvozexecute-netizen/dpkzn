import type { AnatomyZone } from "@/components/ds/Anatomy";
import homeStations from "./anatomy-home-stations.json";
import directFlights from "./anatomy-direct-flights.json";

/**
 * Зоны «Анатомии», которых нет в рендере: салон, днище, кузов целиком.
 * Владелец 03.09: «в анатомии должно быть всё, до деталей» — каждая услуга
 * студии должна находиться через машину, а не только через меню.
 *
 * Живут отдельно от anatomy.json, потому что тот приезжает из рендер-пайплайна
 * и переписывается целиком при каждом выпуске ассетов. Масок у этих зон нет:
 * станция «extra» вне маршрута камеры, чип открывает карточку без полёта и
 * подсветки. Цены «от» — минимумы пакетов из БД (сверено 03.09.2026).
 */
export const EXTRA_STATION = "extra";

/**
 * Домашние станции, переназначенные поверх рендера: на крупных планах эти
 * зоны обрезаны краем кадра (аудит bbox 02.09), с обзора видны целиком.
 * Правка живёт здесь, а не в anatomy.json: пакет v1.4 уже откатил её
 * один раз, вернув фары на «Оптику» — и на мобиле выделенная зона стала
 * занимать весь экран (владелец 03.09).
 */
/** Единый источник и для сайта, и для гейта scripts/anatomy-verify.mjs */
export const HOME_OVERRIDES: Record<string, string> = homeStations;

export const EXTRA_ZONES: AnatomyZone[] = [
  {
    id: "interior",
    label: "Салон",
    station: EXTRA_STATION,
    services: [
      { title: "Химчистка салона", priceFrom: 15000, href: "/himchistka" },
      { title: "Шумоизоляция", priceFrom: 10000, href: "/shumoizolyaciya" },
      { title: "Установка сигнализации", priceFrom: 15000, href: "/ustanovka-signalizacii" },
    ],
  },
  // Зона «Днище и арки» вела только на /antikor и продавала антикор днища
  // от 6 000 ₽. Такой услуги у студии нет (владелец 23.09.2026), поэтому зона
  // выключена насовсем: анатомия показывает только то, что студия делает.
  // Страница /antikor живёт отдельно — как мост из поиска на плёнку и керамику.
  // {
  //   id: "underbody",
  //   label: "Днище и арки",
  //   station: EXTRA_STATION,
  //   services: [{ title: "Антикор", priceFrom: 6000, href: "/antikor" }],
  // },
  {
    id: "whole_body",
    label: "Весь кузов",
    station: EXTRA_STATION,
    services: [
      { title: "Детейлинг кузова", priceFrom: 5000, href: "/detayling-kuzova" },
      { title: "Полировка кузова", priceFrom: 16000, href: "/polirovka" },
      { title: "Защитные покрытия", priceFrom: 2000, href: "/zashchitnye-pokrytiya" },
      { title: "Оклейка плёнкой", priceFrom: 12000, href: "/oklejka-avto" },
      { title: "PPF на весь кузов", priceFrom: 50000, href: "/ppf" },
    ],
  },
];

/**
 * Прямые пролёты между несоседними станциями («S0_S5»). Клипы рендера
 * сняты только между соседями, и к дальней станции камера шла цепочкой
 * через все промежуточные — 4,4 с на тап (владелец 04.09). Пока прямого
 * клипа нет, плеер переходит кроссфейдом; появится в пакете — вписать пару
 * сюда, и полёт включится сам. Единый источник с гейтом anatomy-verify.
 */
export const DIRECT_FLIGHTS: string[] = directFlights.pairs;

/** Подмешивает дополнительные зоны и прямые пролёты к данным рендера, не трогая его файл */
export function withExtraZones<T extends { zones: AnatomyZone[] }>(data: T): T & { directFlights: string[] } {
  const known = new Set(data.zones.map((z) => z.id));
  const zones = data.zones.map((z) => (HOME_OVERRIDES[z.id] ? { ...z, station: HOME_OVERRIDES[z.id] } : z));
  return { ...data, zones: [...zones, ...EXTRA_ZONES.filter((z) => !known.has(z.id))], directFlights: DIRECT_FLIGHTS };
}
