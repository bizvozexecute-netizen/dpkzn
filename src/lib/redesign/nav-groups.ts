/**
 * Группировка услуг в мегаменю Dark Studio (ДС §4.6).
 *
 * Основа — группы из инвентаризации (01-inventory §1.2), которые сейчас в меню
 * покрывают 12 услуг. Оставшиеся 7 (видны только в футере) распределены по
 * ближайшей группе: по ТЗ все 19 обязаны быть в мегаменю.
 *
 * Порядок внутри группы = порядок nav_items в БД. Тексты пунктов берутся оттуда же,
 * здесь только слаги — чтобы правка названия в админке не требовала правки кода.
 */
export const MEGAMENU_GROUPS: { title: string; slugs: string[] }[] = [
  {
    title: "Защита",
    slugs: ["ppf", "broneplenka", "zashchitnye-pokrytiya", "antikor", "antidozhd"],
  },
  {
    title: "Оптика",
    slugs: ["ustanovka-linz", "regulirovka-far"],
  },
  {
    title: "Полировка и уход",
    slugs: ["polirovka", "polirovka-stekol", "polirovka-far", "himchistka", "detayling-kuzova", "vyezdnoj-detayling"],
  },
  {
    title: "Стайлинг и комфорт",
    slugs: ["tonirovka", "antihrom", "oklejka-avto", "shumoizolyaciya", "ustanovka-signalizacii"],
  },
  {
    title: "Другое",
    slugs: ["remont-vmyatin"],
  },
];
