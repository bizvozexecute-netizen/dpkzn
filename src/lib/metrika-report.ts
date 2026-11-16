import { METRIKA_ID } from "@/lib/constants";

/**
 * Отчёт для владельца из Яндекс Метрики (Stats API) — питает /admin/report.
 *
 * Токен — METRIKA_TOKEN в окружении сервера (.env.local): OAuth-токен
 * приложения владельца с доступом к Метрике. Ответы кешируются на 10 минут
 * (fetch revalidate): отчёт открывают пару раз в день, а лимит API общий
 * с другими скриптами.
 *
 * Цели — по id счётчика 108387254 (список снят через Management API
 * 11.09.2026). Метки — человеческие, не технические: отчёт читает заказчик.
 */
export const REPORT_GOALS = [
  { id: 544253622, key: "phone", label: "Клик по телефону", group: "contact" },
  { id: 544295144, key: "whatsapp", label: "Переход в WhatsApp", group: "contact" },
  { id: 544295167, key: "telegram", label: "Переход в Telegram", group: "contact" },
  { id: 544296762, key: "max", label: "Переход в Max", group: "contact" },
  { id: 579361452, key: "quiz_start", label: "Квиз: начали проходить", group: "funnel" },
  { id: 579361469, key: "callback_open", label: "Открыли «Перезвоните» / «Расчёт по фото»", group: "funnel" },
  { id: 579361448, key: "quiz_success", label: "Заявка из квиза", group: "lead" },
  { id: 579361446, key: "form_success", label: "Заявка из формы", group: "lead" },
  { id: 579361449, key: "callback", label: "Заявка «Перезвоните» / «Расчёт по фото»", group: "lead" },
] as const;

export type GoalGroup = (typeof REPORT_GOALS)[number]["group"];

export interface GoalStat {
  key: string;
  label: string;
  group: GoalGroup;
  value: number;
  prev: number;
}

export interface MetrikaTotals {
  visits: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  avgDuration: number;
}

export interface MetrikaReport {
  ok: true;
  date1: string;
  date2: string;
  prevDate1: string;
  prevDate2: string;
  totals: MetrikaTotals;
  prevTotals: MetrikaTotals;
  goals: GoalStat[];
  sources: { name: string; visits: number; users: number }[];
  devices: { name: string; visits: number }[];
  pages: { url: string; visits: number }[];
  daily: { date: string; visits: number }[];
}

export interface MetrikaError {
  ok: false;
  error: string;
}

const API = "https://api-metrika.yandex.net/stat/v1/data";
const REVALIDATE = 600;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Границы периода: последние N дней включая сегодня, и такой же период до него */
export function periodBounds(days: number): { date1: string; date2: string; prevDate1: string; prevDate2: string } {
  const today = new Date();
  const start = new Date(today.getTime() - (days - 1) * 864e5);
  const prevEnd = new Date(start.getTime() - 864e5);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 864e5);
  return { date1: iso(start), date2: iso(today), prevDate1: iso(prevStart), prevDate2: iso(prevEnd) };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Запрос к Stats API. Запросы идут ПОСЛЕДОВАТЕЛЬНО (см. fetchMetrikaReport):
 * на параллельные Метрика отвечает 429 quota_parallel_requests_by_uid —
 * восемь разом она не принимает. 429 всё равно возможен (токен общий с
 * другими скриптами), поэтому две повторные попытки с паузой.
 */
async function metrikaGet(path: string, params: Record<string, string>, token: string): Promise<Record<string, unknown>> {
  const url = new URL(API + path);
  url.searchParams.set("ids", METRIKA_ID);
  // lang=ru — русские подписи измерений («Смартфоны» вместо «Smartphones»).
  // Заголовок Accept-Language Метрика игнорирует, работает только параметр.
  url.searchParams.set("lang", "ru");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(600 * attempt);
    const res = await fetch(url, {
      headers: { Authorization: `OAuth ${token}` },
      next: { revalidate: REVALIDATE },
    });
    if (res.ok) return (await res.json()) as Record<string, unknown>;
    const text = await res.text().catch(() => "");
    lastError = `Метрика ответила ${res.status}: ${text.slice(0, 160)}`;
    if (res.status !== 429) break;
  }
  throw new Error(lastError);
}

const TOTAL_METRICS = "ym:s:visits,ym:s:users,ym:s:pageviews,ym:s:bounceRate,ym:s:avgVisitDurationSeconds";

function toTotals(body: Record<string, unknown>): MetrikaTotals {
  const t = (body.totals as number[] | undefined) ?? [];
  return {
    visits: Math.round(t[0] ?? 0),
    users: Math.round(t[1] ?? 0),
    pageviews: Math.round(t[2] ?? 0),
    bounceRate: t[3] ?? 0,
    avgDuration: t[4] ?? 0,
  };
}

type Row = { dimensions: { name: string }[]; metrics: number[] };

/** Подписи Метрики (ru) → короткие человеческие. Незнакомое остаётся как есть. */
const SOURCE_LABELS: Record<string, string> = {
  "Переходы из поисковых систем": "Поиск",
  "Прямые заходы": "Прямые заходы",
  "Переходы по рекламе": "Реклама",
  "Переходы по ссылкам на сайтах": "Переходы с сайтов",
  "Переходы из социальных сетей": "Соцсети",
  "Переходы из мессенджеров": "Мессенджеры",
  "Внутренние переходы": "Внутренние переходы",
  "Переходы из рекомендательных систем": "Рекомендательные системы",
  "Переходы с сохранённых страниц": "Сохранённые страницы",
  "Переходы по почтовым рассылкам": "Почтовые рассылки",
  "Не определено": "Источник не определён",
};

const DEVICE_LABELS: Record<string, string> = {
  Смартфоны: "Телефон",
  ПК: "Компьютер",
  Планшеты: "Планшет",
  "Смарт ТВ": "ТВ",
};

export async function fetchMetrikaReport(days: number): Promise<MetrikaReport | MetrikaError> {
  const token = process.env.METRIKA_TOKEN;
  if (!token) {
    console.error("[отчёт] METRIKA_TOKEN не задан в окружении сервера");
    return { ok: false, error: "METRIKA_TOKEN не задан в окружении сервера" };
  }

  const { date1, date2, prevDate1, prevDate2 } = periodBounds(days);
  const goalMetrics = REPORT_GOALS.map((g) => `ym:s:goal${g.id}reaches`).join(",");

  try {
    // Строго по очереди: Метрика режет параллельные запросы одного пользователя
    // (429 quota_parallel_requests_by_uid). Восемь запросов — около полутора
    // секунд, и только раз в 10 минут: дальше отдаёт кеш.
    const totals = await metrikaGet("", { metrics: TOTAL_METRICS, date1, date2 }, token);
    const prevTotals = await metrikaGet("", { metrics: TOTAL_METRICS, date1: prevDate1, date2: prevDate2 }, token);
    const goalsNow = await metrikaGet("", { metrics: goalMetrics, date1, date2 }, token);
    const goalsPrev = await metrikaGet("", { metrics: goalMetrics, date1: prevDate1, date2: prevDate2 }, token);
    const sources = await metrikaGet("", { dimensions: "ym:s:lastTrafficSource", metrics: "ym:s:visits,ym:s:users", date1, date2, limit: "8" }, token);
    const devices = await metrikaGet("", { dimensions: "ym:s:deviceCategory", metrics: "ym:s:visits", date1, date2 }, token);
    const pages = await metrikaGet("", { dimensions: "ym:s:startURL", metrics: "ym:s:visits", date1, date2, limit: "8", sort: "-ym:s:visits" }, token);
    const daily = await metrikaGet("/bytime", { metrics: "ym:s:visits", group: "day", date1, date2 }, token);

    const now = (goalsNow.totals as number[] | undefined) ?? [];
    const prev = (goalsPrev.totals as number[] | undefined) ?? [];
    const goals: GoalStat[] = REPORT_GOALS.map((g, i) => ({
      key: g.key,
      label: g.label,
      group: g.group,
      value: Math.round(now[i] ?? 0),
      prev: Math.round(prev[i] ?? 0),
    }));

    const rows = (b: Record<string, unknown>) => ((b.data as Row[] | undefined) ?? []);
    const intervals = (daily.time_intervals as string[][] | undefined) ?? [];
    const dailyValues = ((daily.data as { metrics: number[][] }[] | undefined)?.[0]?.metrics?.[0]) ?? [];

    return {
      ok: true,
      date1,
      date2,
      prevDate1,
      prevDate2,
      totals: toTotals(totals),
      prevTotals: toTotals(prevTotals),
      goals,
      sources: rows(sources).map((r) => ({
        name: SOURCE_LABELS[r.dimensions[0]?.name] ?? r.dimensions[0]?.name ?? "—",
        visits: Math.round(r.metrics[0] ?? 0),
        users: Math.round(r.metrics[1] ?? 0),
      })),
      devices: rows(devices).map((r) => ({
        name: DEVICE_LABELS[r.dimensions[0]?.name] ?? r.dimensions[0]?.name ?? "—",
        visits: Math.round(r.metrics[0] ?? 0),
      })),
      pages: rows(pages).map((r) => ({
        url: (r.dimensions[0]?.name ?? "").replace(/^https?:\/\/(www\.)?dpkzn\.ru/, "") || "/",
        visits: Math.round(r.metrics[0] ?? 0),
      })),
      daily: intervals.map((t, i) => ({ date: t[0], visits: Math.round(dailyValues[i] ?? 0) })),
    };
  } catch (e) {
    // В лог сервера — целиком: на странице текст ошибки урезан
    console.error("[отчёт] Метрика недоступна:", e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
