/**
 * Атрибуция рекламного трафика.
 *
 * Зачем: раньше метки читались только из query-строки той страницы, где отправлена
 * форма. Любой переход по сайту их терял, и лид с Авито или VK выглядел как прямой
 * заход. Здесь метки запоминаются при первом касании и подставляются, если в текущем
 * URL их нет.
 *
 * Приоритет намеренно такой: метки из URL > последнее касание > первое. Пока метки
 * есть в адресе, поведение ровно то же, что и раньше, — атрибуция Директа и amoCRM
 * не меняется.
 */

const STORAGE_KEY = "dp_attribution";

/** 30 дней: премиум-детейлинг обдумывают неделями (плёнка на 180 000 ₽ — не импульс),
 *  и это же окно атрибуции по умолчанию у VK Ads и Директа. */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
/** Идентификаторы клика: yclid — Директ, vk_aid/rb_clickid — VK Ads. */
const CLICK_ID_KEYS = ["yclid", "vk_aid", "rb_clickid"] as const;

export type UtmMap = Record<string, string>;

interface Touch {
  utm: UtmMap;
  referrer?: string;
  landing?: string;
  ts: string;
}

interface Stored {
  first: Touch;
  last: Touch;
  updatedAt: string;
}

export interface AttributionInfo {
  first_utm_source?: string;
  first_utm_medium?: string;
  first_utm_campaign?: string;
  first_utm_content?: string;
  first_referrer?: string;
  first_landing?: string;
  first_ts?: string;
  /** Откуда взяты метки, которые ушли в заявку. */
  touch_source: "url" | "last" | "first" | "none";
}

function readParams(): UtmMap {
  const params = new URLSearchParams(window.location.search);
  const out: UtmMap = {};
  for (const key of [...UTM_KEYS, ...CLICK_ID_KEYS]) {
    const value = params.get(key);
    if (value) out[key] = value;
  }
  return out;
}

/** Внешний переход — считаем касанием, даже если рекламных меток нет:
 *  так лид с «голой» ссылки в профиле Авито всё равно будет опознан. */
function externalReferrer(): string | undefined {
  const ref = document.referrer;
  if (!ref) return undefined;
  try {
    if (new URL(ref).hostname.endsWith(location.hostname)) return undefined;
    return ref;
  } catch {
    return undefined;
  }
}

function load(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.updatedAt || Date.now() - Date.parse(parsed.updatedAt) > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Запоминает касание. Вызывать при каждой загрузке страницы и смене маршрута.
 * Внутренняя навигация (нет ни меток, ни внешнего реферера) ничего не перезаписывает —
 * в этом и есть смысл модуля.
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    const utm = readParams();
    const referrer = externalReferrer();
    if (Object.keys(utm).length === 0 && !referrer) return;

    const touch: Touch = {
      utm,
      referrer,
      landing: window.location.pathname,
      ts: new Date().toISOString(),
    };

    const prev = load();
    const next: Stored = {
      first: prev?.first ?? touch,
      last: touch,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // приватный режим / переполненная квота — атрибуция не критична для отправки заявки
  }
}

/** Метки и справка о первом касании для отправки вместе с заявкой. */
export function resolveAttribution(): { utm: UtmMap; attribution: AttributionInfo } {
  if (typeof window === "undefined") return { utm: {}, attribution: { touch_source: "none" } };

  const current = readParams();
  const stored = load();

  let utm: UtmMap;
  let touch_source: AttributionInfo["touch_source"];

  if (Object.keys(current).length > 0) {
    utm = current;
    touch_source = "url";
  } else if (stored?.last && Object.keys(stored.last.utm).length > 0) {
    utm = stored.last.utm;
    touch_source = "last";
  } else if (stored?.first && Object.keys(stored.first.utm).length > 0) {
    utm = stored.first.utm;
    touch_source = "first";
  } else {
    utm = {};
    touch_source = "none";
  }

  const first = stored?.first;
  return {
    utm,
    attribution: {
      first_utm_source: first?.utm.utm_source,
      first_utm_medium: first?.utm.utm_medium,
      first_utm_campaign: first?.utm.utm_campaign,
      first_utm_content: first?.utm.utm_content,
      first_referrer: first?.referrer,
      first_landing: first?.landing,
      first_ts: first?.ts,
      touch_source,
    },
  };
}
