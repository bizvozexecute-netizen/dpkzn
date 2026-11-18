/**
 * Услуги для «Расчёта по фото». Заявка без услуги (владелец 18.11.2026: «нужно указывать
 * услугу») — непонятно, что считать по фото. Выбор подставляется по странице, откуда
 * открыли форму: страница услуги или тема статьи блога; клиент может поменять.
 */
export interface PhotoService {
  id: string;
  label: string;
  /** Пути страниц услуги и слова в адресе статьи блога */
  paths: string[];
  words: RegExp | null;
}

export const PHOTO_SERVICES: PhotoService[] = [
  { id: "ppf", label: "Антигравийная плёнка (PPF)", paths: ["/ppf", "/broneplenka"], words: /ppf|bronepl|antigrav|zashchit.*plenk|okleyki-avto-plenk/ },
  { id: "wrap", label: "Оклейка цветной плёнкой", paths: ["/oklejka-avto", "/antihrom"], words: /oklejk|vinil|antihrom|smena-cveta|matov/ },
  { id: "polish", label: "Полировка кузова", paths: ["/polirovka", "/detayling-kuzova", "/vyezdnoj-detayling"], words: /polirov(?!ka-far)|polish|detayling-kuzov|gologram|lkp/ },
  { id: "tint", label: "Тонировка", paths: ["/tonirovka"], words: /tonirov|toning|atermal/ },
  { id: "ceramic", label: "Керамика и защитные покрытия", paths: ["/zashchitnye-pokrytiya", "/antidozhd", "/polirovka-stekol"], words: /keramik|pokryt|antidozhd|stekl/ },
  { id: "interior", label: "Химчистка салона", paths: ["/himchistka"], words: /himchist|salon|interior/ },
  { id: "lenses", label: "Установка Bi-LED линз", paths: ["/ustanovka-linz"], words: /bi-led|linz|led/ },
  { id: "headlights", label: "Фары: полировка и регулировка", paths: ["/polirovka-far", "/regulirovka-far"], words: /far(?!m)/ },
  { id: "noise", label: "Шумоизоляция", paths: ["/shumoizolyaciya"], words: /shumo|shumk|comfort-mat|stp/ },
  { id: "alarm", label: "Сигнализация и автозапуск", paths: ["/ustanovka-signalizacii"], words: /signaliz|avtozapusk|starline|pandora/ },
  { id: "dents", label: "Ремонт вмятин", paths: ["/remont-vmyatin"], words: /vmyat/ },
  { id: "other", label: "Другое", paths: [], words: null },
  { id: "unknown", label: "Не знаю — посмотрите по фото", paths: [], words: null },
];

/** Услуга по адресу страницы: страница услуги — точно, статья блога или работа портфолио — по словам в адресе. */
export function serviceForPath(pathname: string | null): string {
  const path = (pathname || "").toLowerCase();
  for (const s of PHOTO_SERVICES)
    if (s.paths.some((p) => path === p || path.startsWith(p + "/"))) return s.id;
  if (path.startsWith("/blog/") || path.startsWith("/portfolio/"))
    for (const s of PHOTO_SERVICES) if (s.words?.test(path)) return s.id;
  return "unknown";
}

/** Текст услуги для заявки и Telegram. */
export function photoServiceText(id: string): string {
  const s = PHOTO_SERVICES.find((x) => x.id === id);
  if (!s || s.id === "unknown") return "Расчёт по фото (услугу не выбрал — посмотреть по фото)";
  return `${s.label} — расчёт по фото`;
}
