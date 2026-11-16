"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "./icons";
import AnatomyEstimate from "./AnatomyEstimate";
import AnatomyLeadForm from "./AnatomyLeadForm";
import type { CarPick } from "./CarPicker";
import type { CarClass } from "@/lib/types";
import { sendAnatomySheet } from "@/lib/redesign/events";
import { ANATOMY_ASSETS_VERSION } from "@/lib/redesign/anatomy-version";
import { cn } from "@/lib/utils";

/**
 * «Анатомия детейлинга» (03-feature-anatomy-3d.md §3.1, §4–6).
 *
 * Никакого WebGL: станции — пре-рендеренные стиллы, переходы между ними —
 * нарезанные клипы одной мастер-траектории, подсветка зоны — её собственная
 * маска, окрашенная в акцент через CSS mask-image. Контур берётся из той же
 * маски: drop-shadow применяется к уже замаскированному слою.
 *
 * Попадание по зоне определяется индексной картой станции (index_S*.png,
 * 2–7 КБ): значение канала R под курсором и есть номер зоны. Точность
 * пиксельная, полигоны не нужны — см. scripts/anatomy-index-maps.mjs.
 *
 * Правила движения камеры — §3.1: зона текущей станции камеру не двигает,
 * соседняя station играет один клип, дальняя — цепочку без телепортов.
 * Подсветка во время полёта не живёт: масок для промежуточных кадров нет.
 *
 * Мобильный вид — «кадр-в-кадре» (ДС §4.9): контейнер 4:3, внутри frame-слой
 * полной геометрии 1920:823 со стиллом, масками и видео; видимое окно
 * двигается translateX'ом (кроп per-station + авто-пан к выбранной зоне +
 * пан пальцем). Ассеты не дублируются, хит-тест меряется от frame — формула
 * не меняется. Карточка зоны на мобиле — нижняя закреплённая панель.
 */

export interface AnatomyZone {
  id: string;
  label: string;
  station: string;
  services: { title: string; priceFrom: number; href: string }[];
}

/** Конфиг режима 360° из anatomy.json v1.3 (§3.2). Секции нет — спина нет. */
export interface AnatomySpin {
  frames: number;
  /** Шаблоны путей кадров, {nn} — номер с ведущим нулём */
  beauty: string;
  zones: string;
  /** Формат станционных карт: значение R в zones_*.png → order[R-1] */
  order?: string[];
  /** Либо палитра цветов зон: zoneId → "#RRGGBB" (zone_palette рендера) */
  palette?: Record<string, string>;
}

export interface AnatomyData {
  stations: Record<string, { label: string; still: string }>;
  order: string[];
  zones: AnatomyZone[];
  /** Параметры подсветки из anatomy.json (с версии 1.1) */
  highlight?: {
    selected?: { fill?: number };
    fillByStation?: Record<string, number>;
  };
  spin?: AnatomySpin;
  /** Прямые пролёты «S0_S5» между несоседними станциями (anatomy-direct-flights.json) */
  directFlights?: string[];
}

export interface AnatomyIndexMap {
  scale: number;
  /** Зоны в хит-тесте станции: индекс в канале R = позиция + 1 */
  stations: Record<string, string[]>;
  /** Зоны с маской на станции — шире хит-теста: вырожденные проекции
   *  по-прежнему горят при выборе, хотя тапнуть по ним нельзя (§11) */
  masks?: Record<string, string[]>;
  /** bbox зон [x0,y0,x1,y1] в долях кадра — питает авто-пан мобильного кропа */
  boxes?: Record<string, Record<string, number[]>>;
  /** центроиды зон [cx,cy] — прицел авто-пана (у изогнутых зон точнее bbox) */
  centers?: Record<string, Record<string, number[]>>;
  /** Палитра спина, восстановленная пайплайном (anatomy-index-maps.mjs) */
  spin?: { frames?: number; palette?: Record<string, string> };
}

interface AnatomyProps {
  data: AnatomyData;
  indexMap: AnatomyIndexMap;
  /** Выбранные зоны — общее состояние с квизом */
  selected: string[];
  onToggle: (zoneId: string) => void;
  /** Сумма минимальных цен выбранных зон — для панели сметы (десктоп) */
  estimateFrom?: number;
  /** CTA сметы: выбор и (если назван) автомобиль уходят в квиз */
  onEstimate?: (pick: CarPick | null) => void;
  /** Классы авто для подбора в смете */
  carClasses?: CarClass[];
  /** Пресет «зоны риска»: чип выбирает набор зон разом; note — строка акции */
  preset?: { label: string; zones: string[]; note?: string | null };
  /** Ещё готовые наборы — вход для тех, кто не хочет разбираться в схеме
   *  (владелец 23.09.2026: «анатомия крутая, но сложная сразу»). Без
   *  сезонной строки: её несёт только основной пресет */
  extraPresets?: { label: string; zones: string[] }[];
  onSelectMany?: (zoneIds: string[]) => void;
  /** Выбранная услуга по зоне (индекс в services); нет — первая */
  choice?: Record<string, number>;
  onChoose?: (zoneId: string, index: number) => void;
  className?: string;
}

const BASE = "/anatomy";
/** Кеш-бастинг immutable-ассетов — см. anatomy-version.ts */
const AV = `?v=${ANATOMY_ASSETS_VERSION}`;

/** Скорость не-последних перегонов по дистанции (§3.1, финальные числа).
 *  Последний перегон всегда 1.2× — торможение перед посадкой; одиночный проезд
 *  идёт на 1.0× без торможения.
 *  Выше 3.0× на 60 Гц строб: браузер отдаёт 24–27 кадров из 49, шаг контента
 *  скачет 1–4 кадра (замер rVFC, docs/redesign/shots/phase4-strobe-*.png).
 *  Потолок 3.0× держит правило монотонным: чем дальше маршрут, тем дольше
 *  поездка. Итоги: 2,04 / 2,55 / 3,06 / 3,74 с. */
/** Длительность одного клипа-перегона на 1.0× (49 кадров, 24 fps) */
const LEG_MS = 2040;
/** Сколько ждём загрузку целевого стилла перед кроссфейдом: дольше — лучше
 *  показать хоть что-то, чем держать тап без ответа */
const STILL_WAIT_MS = 1500;

/* ── Приветственный оборот (десктоп) ─────────────────────────────────────
   Первый показ блока: машина сама делает полный оборот и встаёт на обзор —
   «облёт» из готовых кадров спина, без клипов (владелец 04.09: «это будет
   как wow?»). Только десктоп с мышью: на телефоне до жеста — ноль байт. */
const TOUR_MS = 7000;

/** Картинка в кеш браузера; ошибка или таймаут — тоже «готово» */
const preloadImage = (url: string, timeoutMs: number) =>
  new Promise<void>((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
    window.setTimeout(resolve, timeoutMs);
  });

/** Подсветка гаснет перед полётом и загорается на посадке (§3.1 п.4). */
const FADE_OUT_MS = 120;
const FADE_IN_MS = 200;
const CROSSFADE_MS = 300;

/* ── Мобильный кроп (кадр-в-кадре) ─────────────────────────────────────── */
/** Ширина frame-слоя в долях контейнера 4:3: высота кадра 1920:823 занимает
 *  контейнер целиком → 1920/823 × 3/4 = 1.7502 */
const FRAME_W = 1.7502;
/** Доля кадра, видимая в окне 4:3 */
const CROP_VIEW = 1 / FRAME_W;
/** Максимальный сдвиг окна (левый край) в долях ширины кадра */
const MAX_PAN = 1 - CROP_VIEW;
/** Стартовые позиции окна per-station: центр композиции каждого ракурса */
const CROP_X: Record<string, number> = { S0: 0.2, S1: 0.18, S2: 0.35, S3: 0.21, S4: 0.21, S5: 0.28 };
/** Скорость авто-пана вне перелётов */
const PAN_MS = 350;
/** Порог, после которого движение пальца считается жестом, а не тапом */
const DRAG_THRESHOLD = 8;

/* ── Режим 360° (§3.2): спин — состояние станции S0 ─────────────────────
   48 кадров орбиты, кадр 0 == still_S0 (инвариант склейки). Драг на S0
   листает кадры со снапом; на любой другой станции горизонтальный драг —
   обратная цепочка пролётов до S0. Подсветка и хит-тест на ненулевых кадрах
   живут по зонным картам spin/zones_NN.png. */
/** Полный оборот ≈ 2.2 ширины вьюера (~3 свайпа на мобиле) */
const SPIN_TURN_WIDTHS = 2.2;
/** Скорость доводки к ближайшему кадру после отпускания */
const SNAP_MS = 240;
/** Докрутка до кадра 0 перед выбором зоны: 0.4–0.8 с по дистанции (§3.2 п.3) */
const SPIN_HOME_MS_MIN = 400;
const SPIN_HOME_MS_MAX = 800;
/** Первая ступень загрузки — каждый 4-й кадр (§3.2 п.4) */
const SPIN_COARSE_STEP = 4;
/** Зонные карты разбираются в полном разрешении (1280×549 в v1.4): подсветка
 *  на кадре спина рисуется из этой же карты, и половинный разбор давал
 *  лесенку по контуру зоны при растяжении на кадр (владелец 03.09:
 *  «пиксельное изображение, если машину повернуть»). Порог вырожденных зон
 *  задан в пикселях индексного разрешения станций (960 по ширине) и
 *  пересчитывается под ширину карты. */
const SPIN_MIN_ZONE_PX_AT_960 = 150;
const spinMinZonePx = (mapWidth: number) => Math.round(SPIN_MIN_ZONE_PX_AT_960 * (mapWidth / 960) ** 2);
/** Сколько разобранных зонных карт держим в памяти (LRU, ~2.8 МБ каждая) */
const SPIN_MAP_CACHE = 6;
/** Кеш готовых слоёв подсветки: кадр × набор зон (перерисовка — цикл по 700K px) */
const SPIN_PAINT_CACHE = 8;
const SPIN_HINT_KEY = "dp-anatomy-spin-hint";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clampPan = (x: number) => Math.min(MAX_PAN, Math.max(0, x));

/** Плотность заливки — из anatomy.json: на крупных планах зона занимает почти весь кадр. */
function zoneFill(data: AnatomyData, station: string): number {
  return data.highlight?.fillByStation?.[station] ?? data.highlight?.selected?.fill ?? 0.4;
}

function formatPrice(value: number) {
  return `от ${value.toLocaleString("ru-RU")} ₽`;
}

/**
 * Карточка зоны: на десктопе — стеклянная панель в кадре, на мобиле — нижний
 * шит. Услуги — выбор, а не список ссылок: смета считает по выбранной услуге
 * зоны (владелец 03.09: «почему от 7 000 за такие комплексы» — раньше
 * бралась самая дешёвая). Первая услуга в данных — главная для зоны (PPF,
 * бронирование), она и стоит по умолчанию. Страница услуги — по стрелке.
 */
function ZoneCard({
  zone,
  chosen,
  onChoose,
  onClose,
}: {
  zone: AnatomyZone;
  chosen: number;
  onChoose: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-h4 text-ink">{zone.label}</p>
        <button
          type="button"
          aria-label="Закрыть карточку зоны"
          onClick={onClose}
          className="ds-focus -mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-pill text-ink-secondary hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>

      <ul className="mt-3 space-y-1" role="radiogroup" aria-label={`Услуга для зоны «${zone.label}»`}>
        {zone.services.map((svc, i) => {
          const on = i === chosen;
          return (
            <li key={svc.title} className="flex items-center gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChoose(i)}
                className={cn(
                  "ds-focus flex min-h-9 flex-1 items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-left transition-colors duration-150",
                  on ? "bg-[rgba(var(--accent-rgb),0.1)] text-ink" : "text-ink-secondary hover:text-ink",
                )}
              >
                <span className="flex items-center gap-2 text-body-sm">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-3.5 w-3.5 flex-shrink-0 rounded-pill border transition-colors duration-150",
                      on ? "border-accent bg-accent" : "border-line-strong",
                    )}
                  />
                  {svc.title}
                </span>
                <span className={cn("ds-nums flex-shrink-0 text-caption", on ? "text-accent" : "text-ink-secondary")}>
                  {formatPrice(svc.priceFrom)}
                </span>
              </button>
              <a
                href={svc.href}
                aria-label={`Страница услуги «${svc.title}»`}
                title="Страница услуги"
                className="ds-focus flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-pill text-ink-tertiary transition-colors duration-150 hover:text-ink"
              >
                <ArrowRight size={14} />
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function Anatomy({
  data,
  indexMap,
  selected,
  onToggle,
  estimateFrom = 0,
  onEstimate,
  carClasses = [],
  preset,
  extraPresets,
  onSelectMany,
  choice = {},
  onChoose,
  className,
}: AnatomyProps) {
  const [station, setStation] = useState(data.order[0]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [openZone, setOpenZone] = useState<string | null>(null);
  const [flying, setFlying] = useState(false);
  const [highlightOn, setHighlightOn] = useState(true);
  const [reduced, setReduced] = useState(false);
  /** Указатель над кадром: тултип позиционируется только реальным движением
   *  мыши — при фокусе чипа он прилипал к углу вьюера */
  const [pointerIn, setPointerIn] = useState(false);
  const [crop, setCrop] = useState<{ x: number; dur: number }>({ x: CROP_X[data.order[0]] ?? 0.2, dur: PAN_MS });
  const [scrubbing, setScrubbing] = useState(false);
  /** Уходящий стилл при кроссфейде станций; null — кроссфейда нет */
  const [prevStill, setPrevStill] = useState<string | null>(null);
  /** Идёт приветственный оборот: любой жест или полёт его снимает */
  const touring = useRef(false);
  const tourRaf = useRef(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLUListElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hitmap = useRef<Map<string, ImageData>>(new Map());
  const prefetched = useRef<Set<string>>(new Set());
  const travelling = useRef(false);
  const drag = useRef<{ startX: number; startP: number; moved: boolean } | null>(null);
  /** Позиция спина в кадрах (0..frames); дробная во время драга */
  const spinPos = useRef(0);
  const scrubRef = useRef<HTMLDivElement>(null);
  const spinCanvasRef = useRef<HTMLCanvasElement>(null);
  /** Красивые кадры спина — предзагрузка в Image-кеш браузера */
  const spinBeauty = useRef<Map<number, HTMLImageElement>>(new Map());
  /** Разобранные зонные карты: пиксели + счётчик пикселей по зонам (LRU) */
  const spinMaps = useRef<
    Map<number, { map: ImageData; counts: Map<string, number> } | "loading">
  >(new Map());
  const spinLoadStarted = useRef(false);
  /** Готовые слои подсветки спина: ключ «кадр|зоны» → канвас в разрешении карты */
  const spinPaint = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const snapRaf = useRef(0);
  const [hintOn, setHintOn] = useState(false);
  /** Зона, выбранная во время полёта: обработаем на посадке, а не потеряем */
  const pendingZone = useRef<string | null>(null);
  /** Пан только что был — click, прилетевший следом, не считается тапом.
   *  Метка времени, а не флаг: порядок leave/up/click в эмуляциях гуляет. */
  const suppressClickUntil = useRef(0);

  const zoneById = new Map(data.zones.map((z) => [z.id, z]));
  const active = openZone ? zoneById.get(openZone) : null;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    type NetInfo = { saveData?: boolean };
    const saveData = Boolean((navigator as Navigator & { connection?: NetInfo }).connection?.saveData);
    const sync = () => setReduced(mq.matches || saveData);
    mq.addEventListener("change", sync);
    const id = window.requestAnimationFrame(sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.cancelAnimationFrame(id);
    };
  }, []);

  /** Индексная карта станции: грузим один раз и держим в памяти. */
  const loadHitmap = useCallback(async (st: string) => {
    if (hitmap.current.has(st)) return;
    const img = new Image();
    img.src = `${BASE}/index_${st}.png${AV}`;
    await img.decode().catch(() => undefined);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || !canvas.width) return;
    ctx.drawImage(img, 0, 0);
    hitmap.current.set(st, ctx.getImageData(0, 0, canvas.width, canvas.height));
  }, []);

  useEffect(() => {
    void loadHitmap(station);
  }, [station, loadHitmap]);

  /* ── Шит зоны и sticky CTA не должны стоять друг на друге ── */
  useEffect(() => {
    sendAnatomySheet(Boolean(active));
    return () => sendAnatomySheet(false);
  }, [active]);

  // Секция ушла из вьюпорта — шит не должен висеть над чужим контентом
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setOpenZone(null);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenZone(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Выбор снят полностью — камера отлетает к обзору (пожелание владельца)
  const prevSelectedCount = useRef(selected.length);
  useEffect(() => {
    const was = prevSelectedCount.current;
    prevSelectedCount.current = selected.length;
    if (was > 0 && selected.length === 0 && station !== data.order[0]) {
      void travelTo(data.order[0]);
    }
    // Реагируем только на смену выбора: станция в зависимостях устроила бы
    // отлёт при обычной навигации
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.length]);

  /** Перегоны маршрута — по соседним парам, без телепортов. */
  const routeLegs = useCallback(
    (from: string, to: string): [string, string][] => {
      const a = data.order.indexOf(from);
      const b = data.order.indexOf(to);
      if (a < 0 || b < 0 || a === b) return [];
      // Прямой клип из пакета ассетов — один перегон вместо цепочки
      if (data.directFlights?.includes(`${from}_${to}`)) return [[from, to]];
      const step = b > a ? 1 : -1;
      const legs: [string, string][] = [];
      for (let i = a; i !== b; i += step) legs.push([data.order[i], data.order[i + step]]);
      return legs;
    },
    [data.order, data.directFlights],
  );

  const stillOf = useCallback((st: string) => `${BASE}/${data.stations[st]?.still}${AV}`, [data.stations]);

  /** Что понадобится переходу: соседу — клип, дальней станции — её стилл */
  const routeClips = useCallback(
    (from: string, to: string) => {
      const legs = routeLegs(from, to);
      if (legs.length === 1) return [`${BASE}/flight_${legs[0][0]}_${legs[0][1]}.mp4${AV}`];
      return legs.length ? [stillOf(to)] : [];
    },
    [routeLegs, stillOf],
  );

  /** Клипы кладём в кеш браузера заранее — на старте не грузится ни одного (§3.1). */
  const prefetch = useCallback((urls: string[]) => {
    for (const url of urls) {
      if (prefetched.current.has(url)) continue;
      prefetched.current.add(url);
      void fetch(url).catch(() => undefined);
    }
  }, []);

  /** Стиллы всех станций (~60 КБ каждый): после них кроссфейд к любой
   *  дальней станции мгновенный. Зовётся по первому жесту, не на старте. */
  const prefetchStills = useCallback(
    () => prefetch(data.order.map((st) => stillOf(st))),
    [data.order, prefetch, stillOf],
  );

  /* ── Движок 360° (§3.2) ─────────────────────────────────────────────────
     Обычные функции + ref-мост spinApi для useCallback'ов: движок трогает
     только refs и стабильный конфиг, в массивы зависимостей не попадает. */
  /* Нормализация конфига: рендер v1.3 пишет count/beautyPattern/zonesPattern
     и токен {i:02d}; палитра цветов зонных карт приезжает из index_map.json —
     пайплайн восстанавливает её геометрией (кадр 0 == still_S0). Без палитры
     и порядка спин выключен: вращение без хит-теста хуже его отсутствия. */
  const rawSpin = data.spin as
    | (AnatomySpin & { count?: number; beautyPattern?: string; zonesPattern?: string })
    | undefined;
  const spinPaletteSrc = rawSpin?.palette ?? indexMap.spin?.palette;
  const spin: AnatomySpin | undefined =
    rawSpin && (rawSpin.order || spinPaletteSrc)
      ? {
          frames: rawSpin.frames ?? rawSpin.count ?? 48,
          beauty: (rawSpin.beauty ?? rawSpin.beautyPattern ?? "spin/beauty_{nn}.webp").replace("{i:02d}", "{nn}"),
          zones: (rawSpin.zones ?? rawSpin.zonesPattern ?? "spin/zones_{nn}.png").replace("{i:02d}", "{nn}"),
          order: rawSpin.order,
          palette: spinPaletteSrc,
        }
      : undefined;
  const spinFrames = spin?.frames ?? 0;
  const spinZoneOrder = spin?.order ?? data.zones.map((z) => z.id);
  // Палитра зонных карт → id зоны; ≤20 записей, пересборка на рендер дёшева
  const spinPaletteLut = new Map<number, string>();
  if (spin?.palette)
    for (const [id, hex] of Object.entries(spin.palette))
      spinPaletteLut.set(parseInt(hex.replace("#", ""), 16), id);

  const spinUrl = (pattern: string, i: number) =>
    `${BASE}/${pattern.replace("{nn}", String(i).padStart(2, "0"))}${AV}`;

  /** Кадр, на котором спин стоит сейчас (0 — слит со стиллом S0) */
  const spinFrameNow = () => (spinFrames ? Math.round(spinPos.current) % spinFrames : 0);

  /** Цвет пикселя зонной карты → id зоны: палитра рендера или R-индекс. */
  function spinZoneId(r: number, g: number, b: number): string | null {
    if (spin?.palette) return spinPaletteLut.get((r << 16) | (g << 8) | b) ?? null;
    if (!r) return null;
    return spinZoneOrder[r - 1] ?? null;
  }

  /** Разобранная зонная карта кадра из LRU; нет — разбор стартует в фоне. */
  function getSpinMap(fi: number): { map: ImageData; counts: Map<string, number> } | null {
    if (!spin) return null;
    const cached = spinMaps.current.get(fi);
    if (cached && cached !== "loading") {
      spinMaps.current.delete(fi);
      spinMaps.current.set(fi, cached); // свежепрошенная запись — в хвост LRU
      return cached;
    }
    if (cached === "loading") return null;
    spinMaps.current.set(fi, "loading");
    const img = new window.Image();
    img.src = spinUrl(spin.zones, fi);
    void img
      .decode()
      .then(() => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx || !w) return;
        // Nearest: сглаживание родило бы несуществующие индексы на границах
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, w, h);
        const map = ctx.getImageData(0, 0, w, h);
        const counts = new Map<string, number>();
        for (let p = 0; p < map.data.length; p += 4) {
          const id = spinZoneId(map.data[p], map.data[p + 1], map.data[p + 2]);
          if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
        }
        spinMaps.current.set(fi, { map, counts });
        while (spinMaps.current.size > SPIN_MAP_CACHE) {
          const oldest = spinMaps.current.keys().next().value;
          if (oldest === undefined) break;
          spinMaps.current.delete(oldest);
        }
        // Карта доехала — дорисовать подсветку, если кадр ещё на экране
        if (spinFrameNow() === fi) drawSpinHighlight(fi);
      })
      .catch(() => spinMaps.current.delete(fi));
    return null;
  }

  /** Янтарная подсветка выбранных зон на кадре спина (§3.2 п.2): канвас по
   *  зонной карте, плотность fillByStation S0. На кадре 0 канвас чист —
   *  там работают обычные станционные маски. */
  function drawSpinHighlight(fi: number) {
    const canvas = spinCanvasRef.current;
    if (!canvas || !spin) return;
    const rec = fi !== 0 && selected.length ? getSpinMap(fi) : null;
    if (!rec) {
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const { map } = rec;

    // Слой-маска в разрешении карты: кэш по кадру и набору зон, цикл по
    // пикселям только при промахе
    const key = `${fi}|${[...selected].sort().join(",")}`;
    let layer = spinPaint.current.get(key);
    if (!layer) {
      layer = document.createElement("canvas");
      layer.width = map.width;
      layer.height = map.height;
      const lctx = layer.getContext("2d");
      if (!lctx) return;
      const fillA = Math.round(zoneFill(data, data.order[0]) * 255);
      const chosen = new Set(selected);
      const out = lctx.createImageData(map.width, map.height);
      for (let p = 0; p < map.data.length; p += 4) {
        const id = spinZoneId(map.data[p], map.data[p + 1], map.data[p + 2]);
        if (id && chosen.has(id)) {
          // Акцент — латунь из токенов (--accent), как у станционных масок
          out.data[p] = 201;
          out.data[p + 1] = 166;
          out.data[p + 2] = 107;
          out.data[p + 3] = fillA;
        }
      }
      lctx.putImageData(out, 0, 0);
      spinPaint.current.set(key, layer);
      while (spinPaint.current.size > SPIN_PAINT_CACHE) {
        const oldest = spinPaint.current.keys().next().value;
        if (oldest === undefined) break;
        spinPaint.current.delete(oldest);
      }
    }

    // Видимый канвас — в физических пикселях кадра, маска растягивается
    // с билинейным сглаживанием: край зоны мягкий, а не лесенкой
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const H = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(layer, 0, 0, W, H);
  }

  /** Показ кадра спина для позиции p; до полной загрузки — ближайший
   *  загруженный (§3.2 п.4). Возвращает нормализованную позицию. */
  function showSpinFrame(p: number): number {
    if (!spin || !spinFrames) return 0;
    const wrapped = ((p % spinFrames) + spinFrames) % spinFrames;
    let fi = Math.round(wrapped) % spinFrames;
    if (fi !== 0 && !spinBeauty.current.get(fi)?.naturalWidth) {
      let best = 0;
      let bestD = Math.min(wrapped, spinFrames - wrapped);
      for (const [k, im] of spinBeauty.current) {
        if (!im.complete || !im.naturalWidth) continue;
        const d = Math.min(Math.abs(wrapped - k), spinFrames - Math.abs(wrapped - k));
        if (d < bestD) {
          best = k;
          bestD = d;
        }
      }
      fi = best;
    }
    const scrub = scrubRef.current;
    if (scrub) {
      if (fi !== 0) scrub.style.backgroundImage = `url(${spinUrl(spin.beauty, fi)})`;
      scrub.dataset.on = fi !== 0 ? "true" : "false";
    }
    drawSpinHighlight(fi);
    return wrapped;
  }

  /** Лестница загрузки (§3.2 п.4): по первому pointerdown — каждый 4-й кадр,
   *  затем добор остальных; зонные карты тем же порядком. До жеста — НИЧЕГО:
   *  каскад не должен стоить главной ни пункта perf. */
  function startSpinLoad() {
    if (!spin || spinLoadStarted.current) return;
    spinLoadStarted.current = true;
    const order: number[] = [];
    for (let i = SPIN_COARSE_STEP; i < spinFrames; i += SPIN_COARSE_STEP) order.push(i);
    for (let i = 1; i < spinFrames; i++) if (i % SPIN_COARSE_STEP) order.push(i);
    for (const i of order) {
      const img = new window.Image();
      img.src = spinUrl(spin.beauty, i);
      spinBeauty.current.set(i, img);
    }
    // Зонные карты — только в HTTP-кеш; разбор в ImageData идёт по требованию
    for (const i of order) new window.Image().src = spinUrl(spin.zones, i);
  }

  /** Докрутка к кадру 0 кратчайшей стороной перед выбором/полётом (§3.2 п.3);
   *  reduced-motion — кроссфейд слоя спина вместо анимации. */
  function rollSpinHome(): Promise<void> {
    if (!spin || !spinFrames) return Promise.resolve();
    const wrapped = ((spinPos.current % spinFrames) + spinFrames) % spinFrames;
    if (wrapped === 0) return Promise.resolve();
    if (reduced) {
      spinPos.current = 0;
      showSpinFrame(0); // CSS-переход .ds-anatomy-scrub даёт кроссфейд
      return Promise.resolve();
    }
    const target = wrapped > spinFrames / 2 ? spinFrames : 0;
    const dist = Math.abs(target - wrapped);
    const ms = Math.min(SPIN_HOME_MS_MAX, Math.max(SPIN_HOME_MS_MIN, (dist / (spinFrames / 2)) * SPIN_HOME_MS_MAX));
    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / ms);
        const eased = 1 - (1 - k) * (1 - k);
        spinPos.current = showSpinFrame(wrapped + (target - wrapped) * eased);
        if (k < 1) {
          snapRaf.current = requestAnimationFrame(tick);
          return;
        }
        spinPos.current = 0;
        showSpinFrame(0);
        resolve();
      };
      snapRaf.current = requestAnimationFrame(tick);
    });
  }

  /** Снять приветственный оборот: кадр остаётся где был, дальше им
   *  распоряжается жест или докрутка полёта */
  function cancelTour() {
    if (!touring.current) return;
    touring.current = false;
    cancelAnimationFrame(tourRaf.current);
  }

  /** Приветственный оборот: грубая сетка кадров → полный круг с плавным
   *  разгоном и торможением → кадр 0. Прерывается жестом или полётом. */
  async function runTour() {
    const wrap = wrapRef.current;
    if (touring.current || travelling.current || drag.current) return;
    if (station !== data.order[0] || selected.length > 0 || !spinFrames) {
      if (wrap) wrap.dataset.tour = "skipped:not-overview";
      return;
    }
    if (wrap) wrap.dataset.tour = "started";
    touring.current = true;
    startSpinLoad();
    prefetchStills();
    // Ждём каждый 4-й кадр (с ними оборот уже гладкий), но не дольше 4 с
    const t0 = performance.now();
    while (performance.now() - t0 < 4000 && touring.current) {
      let need = 0;
      let ready = 0;
      for (let i = SPIN_COARSE_STEP; i < spinFrames; i += SPIN_COARSE_STEP) {
        need++;
        const im = spinBeauty.current.get(i);
        if (im?.complete && im.naturalWidth) ready++;
      }
      if (need > 0 && ready >= need) break;
      await wait(100);
    }
    if (!touring.current) return;
    await new Promise<void>((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        if (!touring.current) {
          resolve();
          return;
        }
        const k = Math.min(1, (now - start) / TOUR_MS);
        const eased = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        spinPos.current = showSpinFrame(eased * spinFrames);
        if (k < 1) {
          tourRaf.current = requestAnimationFrame(tick);
          return;
        }
        spinPos.current = 0;
        showSpinFrame(0);
        resolve();
      };
      tourRaf.current = requestAnimationFrame(tick);
    });
    touring.current = false;
  }

  // Первый показ блока на десктопе — оборот, один раз за загрузку страницы
  // (блок живёт только на главной, перезагрузка — осознанное действие).
  // Телефон, reduced-motion и Save-Data — без него: там всё по жесту.
  // Оценку сети браузером не спрашиваем: Chrome на десктопе за VPN
  // отдавал «3g», и оборот молча не стартовал (владелец 04.09). Причина
  // пропуска пишется в data-tour на вьюере — видно в инспекторе.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !spin) return;
    const skip = (why: string) => {
      el.dataset.tour = `skipped:${why}`;
    };
    if (!window.matchMedia("(min-width: 1024px) and (hover: hover)").matches) return skip("touch-or-narrow");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return skip("reduced-motion");
    type NetInfo = { saveData?: boolean };
    const conn = (navigator as Navigator & { connection?: NetInfo }).connection;
    if (conn?.saveData) return skip("save-data");
    el.dataset.tour = "waiting";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        void runTour();
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
    // Нормализованный spin пересоздаётся на рендер — зависимость от сырого конфига
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.spin]);

  /** Ref-мост движка для useCallback'ов (тот же приём, что pickZoneRef) */
  const spinApi = useRef({ frameNow: spinFrameNow, rollHome: rollSpinHome, cancelTour });
  spinApi.current = { frameNow: spinFrameNow, rollHome: rollSpinHome, cancelTour };

  function dismissHint() {
    setHintOn(false);
    try {
      localStorage.setItem(SPIN_HINT_KEY, "1");
    } catch {
      /* приватный режим — хинт просто вернётся в следующей сессии */
    }
  }

  // Хинт «потяните» — при первом знакомстве с блоком, до первого драга
  useEffect(() => {
    if (!spin) return;
    try {
      if (localStorage.getItem(SPIN_HINT_KEY)) return;
    } catch {
      /* нет localStorage — показываем каждый раз */
    }
    setHintOn(true);
    // Нормализованный spin пересоздаётся на рендер — зависимость от сырого конфига
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.spin]);

  // Смена выбора зон перерисовывает подсветку текущего кадра спина
  useEffect(() => {
    const fi = spinApi.current.frameNow();
    if (fi !== 0) drawSpinHighlight(fi);
    // Кадром управляет showSpinFrame; здесь важна только смена выбора
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  /** Окно кропа, центрированное на зоне (мобайл); данных нет — кроп станции. */
  const cropForZone = useCallback(
    (st: string, zoneId: string): number => {
      // Центроид, а не центр bbox: у крыши с борта масса лежит справа,
      // рамка же центрирует окно на пустоте
      const center =
        indexMap.centers?.[st]?.[zoneId]?.[0] ??
        (indexMap.boxes?.[st]?.[zoneId] ? (indexMap.boxes[st][zoneId][0] + indexMap.boxes[st][zoneId][2]) / 2 : null);
      if (center == null) return CROP_X[st] ?? 0.2;
      return clampPan(center - CROP_VIEW / 2);
    },
    [indexMap.boxes, indexMap.centers],
  );

  /* ── Хит-тест: координаты нормируются по frame-слою, кроп учитывается сам.
        На ненулевом кадре спина — по зонной карте кадра (§3.2 п.2), с тем же
        порогом вырожденных зон, что в станционных индексных картах. ── */
  function zoneAt(clientX: number, clientY: number): string | null {
    const el = frameRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();

    const fi = station === data.order[0] ? spinFrameNow() : 0;
    if (fi !== 0) {
      const rec = getSpinMap(fi);
      if (!rec) return null; // карта ещё разбирается — попадание отдаст следующий move
      const { map, counts } = rec;
      const x = Math.floor(((clientX - rect.left) / rect.width) * map.width);
      const y = Math.floor(((clientY - rect.top) / rect.height) * map.height);
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null;
      const p = (y * map.width + x) * 4;
      const id = spinZoneId(map.data[p], map.data[p + 1], map.data[p + 2]);
      if (!id || (counts.get(id) ?? 0) < spinMinZonePx(map.width)) return null;
      return zoneById.has(id) ? id : null;
    }

    const map = hitmap.current.get(station);
    if (!map) return null;
    const x = Math.floor(((clientX - rect.left) / rect.width) * map.width);
    const y = Math.floor(((clientY - rect.top) / rect.height) * map.height);
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null;

    const index = map.data[(y * map.width + x) * 4];
    if (!index) return null;
    return indexMap.stations[station]?.[index - 1] ?? null;
  }

  /**
   * Переход к станции (§3.1). К соседней (или по прямому клипу из пакета) —
   * полёт: подсветка гаснет, играет клип, на посадке кадр подменяется
   * стиллом и зона загорается. К дальней — кроссфейд стиллов за треть
   * секунды: цепочка через все промежуточные станции держала тап без ответа
   * 4,4 с (владелец 04.09). Мобильное окно кропа едет к целевой станции
   * синхронно с переходом.
   */
  const travelTo = useCallback(
    async (target: string) => {
      if (target === station || travelling.current) return;
      travelling.current = true;
      spinApi.current.cancelTour();

      // Спин стоит на ненулевом кадре — сперва докрутка к кадру 0 (§3.2 п.3);
      // начатая доводка снапа обрывается: полёт главнее
      cancelAnimationFrame(snapRaf.current);
      setScrubbing(false);
      if (spinApi.current.frameNow() !== 0) await spinApi.current.rollHome();

      const legs = routeLegs(station, target);
      const clip = legs.length === 1 && !reduced ? legs[0] : null;

      setHighlightOn(false);
      await wait(FADE_OUT_MS);

      if (!clip) {
        // Кроссфейд стилл→стилл (§3.1 п.5): уходящий кадр гаснет поверх
        // нового, и только когда новый уже загружен
        await preloadImage(stillOf(target), STILL_WAIT_MS);
        setPrevStill(stillOf(station));
        setCrop({ x: CROP_X[target] ?? 0.2, dur: reduced ? 0 : CROSSFADE_MS });
        setStation(target);
        await wait(CROSSFADE_MS + 40);
        setPrevStill(null);
      } else {
        setFlying(true);
        // Окно кропа сопровождает полёт всю его длительность
        setCrop({ x: CROP_X[target] ?? 0.2, dur: LEG_MS });
        const video = videoRef.current;
        if (video) {
          video.src = `${BASE}/flight_${clip[0]}_${clip[1]}.mp4${AV}`;
          video.playbackRate = 1;
          try {
            await video.play();
            await new Promise<void>((resolve) => {
              const done = () => {
                video.removeEventListener("ended", done);
                video.removeEventListener("error", done);
                resolve();
              };
              video.addEventListener("ended", done);
              video.addEventListener("error", done);
              // Страховка: iOS иногда не отдаёт ended при смене src —
              // блок не должен зависнуть на чёрном кадре.
              window.setTimeout(done, 6000);
            });
          } catch {
            /* автоплей заблокирован — просто переключаем кадр */
          }
        }
        setStation(target);
        setFlying(false);
      }

      setCrop((c) => ({ ...c, dur: PAN_MS }));
      setHighlightOn(true);
      travelling.current = false;

      // Клик по зоне, прилетевший во время полёта, отрабатывает на посадке
      const queued = pendingZone.current;
      if (queued) {
        pendingZone.current = null;
        pickZoneRef.current?.(queued);
      }

      // После посадки — соседние клипы, чтобы следующий шаг стартовал сразу.
      const at = data.order.indexOf(target);
      prefetch(
        [data.order[at - 1], data.order[at + 1]]
          .filter(Boolean)
          .flatMap((n) => routeClips(target, n)),
      );
    },
    [data.order, prefetch, reduced, routeClips, routeLegs, station, stillOf],
  );

  /* Мобайл: шит выезжает снизу и закрывает нижнюю половину экрана — если
     кадр с машиной там, подсвеченную зону не видно (владелец 03.09). После
     открытия докручиваем страницу так, чтобы кадр целиком стоял над шитом,
     но не заезжал под шапку. */
  useEffect(() => {
    if (!openZone) return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    const id = window.setTimeout(() => {
      const sheet = sheetRef.current;
      const frame = frameRef.current;
      if (!sheet || !frame) return;
      const sheetTop = window.innerHeight - sheet.getBoundingClientRect().height;
      const fb = frame.getBoundingClientRect();
      const overlap = fb.bottom + 8 - sheetTop;
      const room = Math.max(0, fb.top - 68);
      const delta = Math.min(overlap, room);
      if (delta > 0) window.scrollBy({ top: delta, behavior: reduced ? "auto" : "smooth" });
    }, 280);
    return () => window.clearTimeout(id);
  }, [openZone, reduced]);

  const pickZoneRef = useRef<((id: string) => void) | null>(null);

  function pickZone(id: string, from: "chip" | "car" = "chip") {
    const zone = zoneById.get(id);
    if (!zone) return;
    if (travelling.current || scrubbing) {
      // Камера занята — не молчим, а ставим выбор в очередь до посадки
      pendingZone.current = id;
      return;
    }
    const deselecting = selected.includes(id);
    if (deselecting && from === "car") {
      // Клик по уже выбранной зоне на машине открывает её карточку (выбрать
      // услугу), а не снимает выбор: снять — крестиком в смете или чипом.
      // Иначе после пресета «зоны риска» услуги зон было не посмотреть.
      setOpenZone(id);
      if (zone.station === station) setCrop({ x: cropForZone(station, id), dur: PAN_MS });
      return;
    }
    if (!deselecting && spinFrameNow() !== 0) {
      // Выбор из спина: докрутка до кадра 0, затем обычная цепочка (§3.2 п.3).
      // Снятие выбора камеру не трогает и здесь — гаснет прямо на кадре спина.
      void rollSpinHome().then(() => pickZoneRef.current?.(id));
      return;
    }
    onToggle(id);
    if (deselecting) {
      // Снятие выделения камеру не двигает; карточка не схлопывается в
      // пустоту, а показывает последнюю из оставшихся выбранных зон
      if (openZone === id) {
        const remaining = selected.filter((z) => z !== id);
        setOpenZone(remaining.at(-1) ?? null);
      }
      return;
    }
    if (zone.station === station || !data.order.includes(zone.station)) {
      // Зона текущей станции камеру не двигает — на мобиле окно кропа
      // доезжает до зоны, чтобы подсветку было видно. Зоны без станции
      // (салон, днище) — только карточка, без полёта.
      if (zone.station === station) setCrop({ x: cropForZone(station, id), dur: PAN_MS });
      setOpenZone(id);
      return;
    }
    setOpenZone(null);
    void travelTo(zone.station).then(() => {
      setCrop({ x: cropForZone(zone.station, id), dur: PAN_MS });
      setOpenZone(id);
    });
  }

  /* ── Вращение машины (§3.2 п.1): на S0 горизонтальный драг листает кадры
        спина со снапом; на любой другой станции тот же жест — обратная
        цепочка пролётов до S0. Вертикальный жест остаётся браузеру
        (touch-action: pan-y). ── */
  function onPointerDown(e: React.PointerEvent) {
    if (flying || travelling.current || scrubbing) return;
    // Жест перехватывает приветственный оборот с текущего кадра
    cancelTour();
    // Каскад загрузки кадров — строго после жеста (перф-гейт: init чист)
    if (station === data.order[0]) startSpinLoad();
    prefetchStills();
    drag.current = { startX: e.clientX, startP: spinPos.current, moved: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (d) {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const dx = e.clientX - d.startX;
      if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
      if (station !== data.order[0] || !spin) {
        // Горизонтальный жест со станции — дорога назад к обзору (§3.2 п.3)
        drag.current = null;
        suppressClickUntil.current = Date.now() + 500;
        if (station !== data.order[0]) void travelTo(data.order[0]);
        return;
      }
      if (!d.moved) {
        d.moved = true;
        // Захват — на контейнер: захват на ребёнке ретаргетит события и
        // контейнеру прилетает pointerleave, обрывавший жест на первом шаге
        wrapRef.current?.setPointerCapture(e.pointerId);
        setScrubbing(true);
        setHovered(null);
        if (hintOn) dismissHint();
      }
      const pxPerFrame = (wrap.getBoundingClientRect().width * SPIN_TURN_WIDTHS) / spinFrames;
      // Тянем машину: палец вправо — машина крутится за пальцем
      spinPos.current = showSpinFrame(d.startP - dx / pxPerFrame);
      suppressClickUntil.current = Date.now() + 500;
      return;
    }

    if (flying || scrubbing) return;
    if (!pointerIn) setPointerIn(true);
    const id = zoneAt(e.clientX, e.clientY);
    if (id !== hovered) setHovered(id);
    // Подпись зоны у курсора — transform'ом, без setState на каждый move
    const tip = tipRef.current;
    const wrap = wrapRef.current;
    if (tip && wrap) {
      const rect = wrap.getBoundingClientRect();
      tip.style.transform = `translate(${e.clientX - rect.left + 16}px, ${e.clientY - rect.top + 20}px)`;
    }
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    suppressClickUntil.current = Date.now() + 500;
    // Снап к ближайшему кадру; до полной загрузки — к ближайшему загруженному
    const from = spinPos.current;
    let target = Math.round(from);
    const tf = ((target % spinFrames) + spinFrames) % spinFrames;
    if (tf !== 0 && !spinBeauty.current.get(tf)?.naturalWidth) {
      let bestD = Number.POSITIVE_INFINITY;
      const loaded = [0, ...[...spinBeauty.current.entries()].filter(([, im]) => im.complete && im.naturalWidth).map(([k]) => k)];
      for (const k of loaded)
        for (const lap of [-spinFrames, 0, spinFrames]) {
          const dist = Math.abs(k + lap - from);
          if (dist < bestD) {
            bestD = dist;
            target = k + lap;
          }
        }
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / SNAP_MS);
      const eased = 1 - (1 - k) * (1 - k);
      spinPos.current = showSpinFrame(from + (target - from) * eased);
      if (k < 1) {
        snapRaf.current = requestAnimationFrame(tick);
        return;
      }
      spinPos.current = ((Math.round(target) % spinFrames) + spinFrames) % spinFrames;
      showSpinFrame(spinPos.current);
      setScrubbing(false);
      // Разбор зонной карты кадра — сразу: первый тап на повёрнутой машине
      // не должен уходить в пустоту, пока карта декодируется
      if (spinPos.current !== 0) getSpinMap(spinPos.current);
    };
    snapRaf.current = requestAnimationFrame(tick);
  }

  useEffect(() => () => cancelAnimationFrame(snapRaf.current), []);

  pickZoneRef.current = pickZone;

  // Подсвечиваем каждую выбранную зону, у которой есть маска на текущем
  // ракурсе (маски есть почти на всех станциях, не только на «домашней») —
  // иначе выбранный капот «тух» при перелёте к фарам.
  const availableHere = new Set(indexMap.masks?.[station] ?? indexMap.stations[station] ?? []);
  const selectedHere = selected.filter((id) => availableHere.has(id));
  const fill = zoneFill(data, station);
  const stillUrl = `${BASE}/${data.stations[station]?.still}${AV}`;

  // Чипы зон — по порядку станций: лента на мобиле читается как маршрут.
  // Зоны без станции в маршруте (салон, днище, кузов целиком) — в конце.
  const orderedZones = [
    ...data.order.flatMap((st) => data.zones.filter((z) => z.station === st)),
    ...data.zones.filter((z) => !data.order.includes(z.station)),
  ];
  const selectedZones = selected.map((id) => zoneById.get(id)).filter((z): z is AnatomyZone => Boolean(z));
  const presetOn = Boolean(preset && preset.zones.every((z) => selected.includes(z)));

  /** Пресет: набор зон одним тапом, камера — на обзор, где они все видны */
  function applyPreset(zones: string[] | undefined = preset?.zones) {
    if (!zones) return;
    onSelectMany?.(zones);
    setOpenZone(null);
    if (station !== data.order[0]) void travelTo(data.order[0]);
  }

  /** Сумма набора «от» — по главной услуге каждой детали, как в смете */
  const presetSum = (zones: string[]) =>
    zones.reduce((sum, id) => sum + (zoneById.get(id)?.services[0]?.priceFrom ?? 0), 0);

  // Панель встаёт с той стороны кадра, где зоны нет: центроид правее
  // середины — панель слева. Без открытой зоны — справа (на S0 там воздух).
  const panelSide =
    active && (indexMap.centers?.[station]?.[active.id]?.[0] ?? 0) > 0.55 ? "left" : "right";

  // Лента чипов доезжает до группы станции, на которую села камера
  useEffect(() => {
    const list = chipsRef.current;
    if (!list || list.scrollWidth <= list.clientWidth) return;
    const chip = list.querySelector<HTMLElement>(`[data-station="${station}"]`);
    if (chip) list.scrollTo({ left: Math.max(0, chip.offsetLeft - 8), behavior: "smooth" });
  }, [station]);

  return (
    <div
      className={cn(
        // Широкий десктоп (≥1280): машина слева, справа колонка — карточка
        // открытой зоны и смета (владелец 08.09: «справа есть место, пусть там
        // собирается смета»). До 1280 колонке негде жить — карточка остаётся
        // в кадре, смета под ним.
        "select-none xl:grid xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start xl:gap-6",
        className,
      )}
    >
    <div className="min-w-0">
      {/* Станции — сегменты камеры на одной линии: активная подчёркнута
          латунью (класс border-accent читает верификатор) */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
        {data.order.map((st) => (
          <button
            key={st}
            type="button"
            disabled={flying}
            onPointerEnter={() => prefetch(routeClips(station, st))}
            onFocus={() => prefetch(routeClips(station, st))}
            onClick={() => void travelTo(st)}
            className={cn(
              "ds-focus -mb-px h-11 flex-shrink-0 border-b-2 px-3 text-caption transition-colors duration-150",
              st === station ? "border-accent text-ink" : "border-transparent text-ink-secondary hover:text-ink",
            )}
          >
            {/* Чип «360°» (§3.2 п.3): возврат к обзору = вход в режим вращения */}
            {st === data.order[0] && spin
              ? `${data.stations[st]?.label ?? st} · 360°`
              : (data.stations[st]?.label ?? st)}
          </button>
        ))}
      </div>

      <div>
        {/* Вьюер: на мобиле — окно 4:3 с кропом, на десктопе — полный кадр во
            всю ширину; услуги и смета живут стеклянной панелью внутри кадра
            (владелец 02.09: колонка чипов справа оставляла пустоту под машиной) */}
        <div
          ref={wrapRef}
          className="ds-anatomy-crop relative aspect-[4/3] w-full min-w-0 touch-pan-y overflow-hidden rounded-lg border border-line bg-elevated lg:aspect-[1920/823]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => {
            setHovered(null);
            setPointerIn(false);
            // Начатый пан не обрываем: его закроют pointerup/pointercancel
            // (при захвате на контейнере leave не значит потерю пальца)
            if (drag.current && !drag.current.moved) drag.current = null;
          }}
          onClick={(e) => {
            // Во время полёта/вращения станция промежуточная — клик выбрал бы не то
            if (flying || travelling.current || scrubbing) return;
            if (Date.now() < suppressClickUntil.current) return;
            const id = zoneAt(e.clientX, e.clientY);
            if (id) pickZone(id, "car");
          }}
        >
          {/* Frame полной геометрии кадра: всё, что относится к сцене, живёт
              в нём и кропается одним transform'ом */}
          <div
            ref={frameRef}
            className="ds-anatomy-frame"
            style={{
              ["--crop-tx" as string]: `${-crop.x * 100}%`,
              ["--crop-dur" as string]: `${crop.dur}ms`,
            }}
          >
            {/* Кадр станции — фоном, а не <img>. React переустанавливал src на
                каждом рендере вьюера, запросы шли внахлёст и кеш не срабатывал:
                один стилл грузился 19 раз по 57 КБ. Фон меняется только вместе
                со станцией. */}
            <div
              role="img"
              aria-label={`Автомобиль, ракурс «${data.stations[station]?.label ?? station}»`}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${stillUrl})` }}
            />
            {/* Уходящий стилл при кроссфейде станций — гаснет CSS-анимацией */}
            {prevStill && (
              <div
                key={prevStill}
                aria-hidden="true"
                className="ds-anatomy-still-prev"
                style={{ backgroundImage: `url(${prevStill})` }}
              />
            )}

            {/* Вуаль: пока есть выбранные зоны, остальной кадр приглушён */}
            <div
              aria-hidden="true"
              className="ds-anatomy-veil"
              data-on={highlightOn && selectedHere.length > 0}
            />

            {/* Подсветка выбранных зон, видимых с этого ракурса */}
            {highlightOn &&
              selectedHere.map((id) => (
                <span
                  key={id}
                  aria-hidden="true"
                  className="ds-anatomy-zone ds-anatomy-zone--selected"
                  style={{
                    ["--mask" as string]: `url(${BASE}/mask_${station}_${id}.png${AV})`,
                    ["--still" as string]: `url(${stillUrl})`,
                    ["--zone-fill" as string]: fill,
                  }}
                >
                  <span className="ds-anatomy-zone-tint" />
                </span>
              ))}

            {/* Наведение */}
            {highlightOn && !flying && hovered && !selected.includes(hovered) && (
              <span
                aria-hidden="true"
                className="ds-anatomy-zone ds-anatomy-zone--hover"
                style={{ ["--mask" as string]: `url(${BASE}/mask_${station}_${hovered}.png${AV})` }}
              />
            )}

            {/* Кадр спина — поверх стилла и станционных масок, пока машина
                повёрнута (data-on ведёт showSpinFrame императивно) */}
            <div ref={scrubRef} aria-hidden="true" className="ds-anatomy-scrub" />
            {/* Подсветка выбранных зон на кадрах спина (§3.2 п.2) */}
            <canvas ref={spinCanvasRef} aria-hidden="true" className="ds-anatomy-spin-paint" />

            {/* Видео-пролёт поверх кадра */}
            <video
              ref={videoRef}
              muted
              playsInline
              preload="none"
              aria-hidden="true"
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity",
                flying ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              style={{ transitionDuration: `${FADE_IN_MS}ms` }}
            />
          </div>

          {/* Подпись зоны у курсора (десктоп) — те же названия, что в чипах */}
          <div
            ref={tipRef}
            hidden={!hovered || !pointerIn || flying}
            aria-hidden="true"
            className="ds-anatomy-tip hidden lg:block"
          >
            {hovered ? zoneById.get(hovered)?.label : null}
          </div>

          {/* Пока висит хинт вращения, подпись на мобиле ему уступает место */}
          {!(spin && hintOn) && (
            <p className="pointer-events-none absolute bottom-3 left-4 z-[4] text-caption text-ink-secondary lg:hidden">
              Нажмите на зону
            </p>
          )}
          <p className="pointer-events-none absolute bottom-3 left-4 z-[4] hidden text-caption text-ink-secondary lg:block">
            Наведите на зону
          </p>
          {/* Хинт вращения (§3.2): без него фичу не находят; исчезает после
              первого драга навсегда (localStorage) */}
          {spin && hintOn && !flying && (
            <div aria-hidden="true" className="ds-anatomy-hint">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
              Потяните, чтобы повернуть
            </div>
          )}

          {/* 1024–1279: карточка открытой зоны — стеклянной панелью в кадре, с той
              стороны, где зоны нет; смета под кадром рядом с чипами. От 1280
              и карточка, и смета живут в правой колонке — кадр целиком машине.
              События не пробрасываем во вьюер: клик по услуге — не вращение. */}
          {active && (
            <aside
              className="ds-anatomy-panel hidden lg:flex xl:hidden"
              data-side={panelSide}
              aria-label="Услуги зоны"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerMove={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <ZoneCard
                zone={active}
                chosen={choice[active.id] ?? 0}
                onChoose={(i) => onChoose?.(active.id, i)}
                onClose={() => setOpenZone(null)}
              />
            </aside>
          )}
        </div>
      </div>

      {/* Чипы зон под кадром: на мобиле лента со снапом, на десктопе — строки
          в ширину кадра; карточка зоны на мобиле — нижний шит */}
      {/* Под кадром: чипы зон; на 1024–1279 справа от них — смета по выбранным
          зонам (от 1280 она в правой колонке). На мобиле смета — в сводке под
          блоком (AnatomySection). */}
      <div className={cn("mt-4 lg:grid lg:gap-6 xl:block", selected.length > 0 && "lg:grid-cols-[minmax(0,1fr)_360px]")}>
      <ul
        ref={chipsRef}
        className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-wrap lg:content-start lg:overflow-visible lg:pb-0"
      >
            {preset && (
              <li className="flex-shrink-0 snap-start">
                <button
                  type="button"
                  aria-pressed={presetOn}
                  onClick={() => applyPreset()}
                  title={preset.note ?? "Передняя проекция: капот, бампер, фары, крылья"}
                  className="ds-chip ds-focus ds-chip--current"
                >
                  <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-pill bg-accent" />
                  {preset.label}
                  <span className="ds-nums text-ink-secondary">· {formatPrice(presetSum(preset.zones))}</span>
                </button>
              </li>
            )}
            {extraPresets?.map((p) => {
              const on = p.zones.every((z) => selected.includes(z));
              return (
                <li key={p.label} className="flex-shrink-0 snap-start">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => applyPreset(p.zones)}
                    title={p.zones.map((z) => zoneById.get(z)?.label).filter(Boolean).join(", ")}
                    className="ds-chip ds-focus ds-chip--current"
                  >
                    <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-pill bg-accent" />
                    {p.label}
                    <span className="ds-nums text-ink-secondary">· {formatPrice(presetSum(p.zones))}</span>
                  </button>
                </li>
              );
            })}
            {orderedZones.map((z, i) => {
              const groupStart = i > 0 && orderedZones[i - 1].station !== z.station;
              return (
                <li
                  key={z.id}
                  data-station={z.station}
                  className={cn("flex-shrink-0 snap-start", groupStart && "ml-3 lg:ml-0")}
                >
                  <button
                    type="button"
                    aria-pressed={selected.includes(z.id)}
                    title={`${z.label} — ракурс «${data.stations[z.station]?.label ?? z.station}»`}
                    onPointerEnter={() => prefetch(routeClips(station, z.station))}
                    onFocus={() => {
                      setHovered(availableHere.has(z.id) ? z.id : null);
                      prefetch(routeClips(station, z.station));
                    }}
                    onBlur={() => setHovered(null)}
                    onClick={() => pickZone(z.id)}
                    className={cn("ds-chip ds-focus", z.station === station && "ds-chip--current")}
                  >
                    {z.label}
                  </button>
                </li>
              );
            })}
      </ul>

      {selected.length > 0 && onEstimate && (
        <AnatomyEstimate
          className="hidden rounded-lg border border-line bg-surface p-5 lg:block xl:hidden"
          zones={selectedZones}
          choice={choice}
          estimateFrom={estimateFrom}
          carClasses={carClasses}
          onRemove={onToggle}
          onEstimate={onEstimate}
          seasonNote={presetOn ? preset?.note : null}
        />
      )}
      </div>
    </div>

      {/* Широкий десктоп: правая колонка. Сверху — услуги открытой зоны, под
          ними — смета по всем выбранным. Пусто — подсказка, чтобы колонка не
          выглядела дырой. Липнет к верху при скролле: колонка выше кадра. */}
      <aside className="hidden xl:sticky xl:top-24 xl:block" aria-label="Расчёт по выбранным зонам">
        {active && (
          <div className="rounded-lg border border-line bg-surface p-5">
            <ZoneCard
              zone={active}
              chosen={choice[active.id] ?? 0}
              onChoose={(i) => onChoose?.(active.id, i)}
              onClose={() => setOpenZone(null)}
            />
          </div>
        )}
        {selected.length > 0 && onEstimate ? (
          <AnatomyEstimate
            className={cn("rounded-lg border border-line bg-surface p-5", active && "mt-4")}
            zones={selectedZones}
            choice={choice}
            estimateFrom={estimateFrom}
            carClasses={carClasses}
            onRemove={onToggle}
            onEstimate={onEstimate}
            seasonNote={presetOn ? preset?.note : null}
          />
        ) : (
          !active && (
            <div className="rounded-lg border border-dashed border-line p-5">
              <p className="text-body-sm text-ink-secondary">
                Выберите зону на машине или в списке — здесь соберётся расчёт по выбранным зонам.
              </p>
            </div>
          )
        )}
      </aside>

      {/* Мобайл: карточка зоны — закреплённая панель снизу (ДС §4.9).
          Остаётся в DOM: transform-анимация дешевле перемонтирования. */}
      <div
        ref={sheetRef}
        role="region"
        aria-label={active ? `Услуги для зоны «${active.label}»` : undefined}
        inert={!active}
        data-open={Boolean(active)}
        className="ds-anatomy-sheet lg:hidden"
      >
        {active && (
          <ZoneCard
            zone={active}
            chosen={choice[active.id] ?? 0}
            onChoose={(i) => onChoose?.(active.id, i)}
            onClose={() => setOpenZone(null)}
          />
        )}
        {/* Заявка прямо из шита: итог по выбранным зонам, телефон, кнопка
            (владелец 03.09: «в шите нет кнопки заказать») */}
        {active && selected.length > 0 && (
          <AnatomyLeadForm
            className="mt-4 border-t border-line pt-4"
            zones={selectedZones}
            choice={choice}
            estimateFrom={estimateFrom}
            carClasses={carClasses}
            seasonNote={presetOn ? preset?.note : null}
          />
        )}
      </div>
    </div>
  );
}
