import { contactReport, funnelReport } from "@/lib/db/funnel";
import Link from "next/link";
import { fetchMetrikaReport, type GoalGroup } from "@/lib/metrika-report";
import { getLeadsReport } from "@/lib/db/queries/leads-report";

/**
 * Отчёт для заказчика: трафик, обращения и заявки за период — на одной
 * странице, без похода в Метрику. Левая часть цифр — Метрика (клики по
 * телефону и мессенджерам, старты квиза, заявки по целям), правая —
 * встроенная CRM (реальные заявки с источником и статусом).
 *
 * Серверная страница без клиентского JS: период — параметр в адресе,
 * Метрика кешируется на 10 минут. Столбики по дням — чистый CSS: одна
 * серия, один цвет, подпись только у максимума.
 */
export const dynamic = "force-dynamic";

const PERIODS = [7, 30, 90] as const;

const STATUS_LABELS: Record<string, string> = {
  new: "Новые",
  in_progress: "В работе",
  booked: "Записан в студию",
  won: "Сделка",
  lost: "Отказ",
  needs_phone: "Нужен номер",
};

const GROUP_TITLES: Record<GoalGroup, string> = {
  contact: "Обращения напрямую",
  funnel: "Шаги воронки",
  lead: "Заявки по целям Метрики",
};

const fmt = (n: number) => n.toLocaleString("ru-RU");
const pct = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;
const dur = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};
const dmy = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y.slice(2)}`;
};
const dm = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
};

function Delta({ now, prev, invert = false }: { now: number; prev: number; invert?: boolean }) {
  if (!prev && !now) return <span className="text-xs text-[#6B6B6B]">—</span>;
  if (!prev) return <span className="text-xs text-[#A0A0A0]">новое</span>;
  const diff = ((now - prev) / prev) * 100;
  const good = invert ? diff < 0 : diff > 0;
  const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "•";
  const tone = Math.abs(diff) < 1 ? "text-[#A0A0A0]" : good ? "text-[#3ddc84]" : "text-[#FF6B6B]";
  return (
    <span className={`whitespace-nowrap text-xs ${tone}`} title={`Прошлый период: ${fmt(prev)}`}>
      {arrow} {Math.abs(diff).toFixed(0)}%
    </span>
  );
}

function Tile({ label, value, now, prev, invert, hint }: { label: string; value: string; now?: number; prev?: number; invert?: boolean; hint?: string }) {
  return (
    <div className="rounded-xl border border-[#333333] bg-[#1A1A1A] p-5">
      <p className="text-sm text-[#A0A0A0]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#F5F5F5]">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {now !== undefined && prev !== undefined && <Delta now={now} prev={prev} invert={invert} />}
        {hint && <span className="text-xs text-[#6B6B6B]">{hint}</span>}
      </div>
    </div>
  );
}

/** Столбики по дням: одна серия, подпись только у максимума, тултип на каждом */
function Bars({ points, unit }: { points: { date: string; value: number }[]; unit: string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const wide = points.length > 45;
  return (
    <div className="flex h-28 items-end gap-[2px]" role="img" aria-label={`${unit} по дням`}>
      {points.map((p) => {
        const h = (p.value / max) * 100;
        const isMax = p.value === max && p.value > 0;
        return (
          <div key={p.date} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${dmy(p.date)}: ${fmt(p.value)}`}>
            {isMax && !wide && <span className="mb-1 text-center text-[10px] leading-none text-[#F5F5F5]">{fmt(p.value)}</span>}
            <div
              className="w-full rounded-t-[4px] bg-[#CCFF00]/80 transition-colors group-hover:bg-[#CCFF00]"
              style={{ height: `${Math.max(h, p.value > 0 ? 3 : 1)}%`, opacity: p.value > 0 ? 1 : 0.25 }}
            />
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#333333] bg-[#1A1A1A] p-5">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-[#F5F5F5]">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Table({ rows, head }: { rows: (string | number)[][]; head: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-[#6B6B6B]">
            {head.map((h, i) => (
              <th key={h} className={`pb-2 font-medium ${i > 0 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={head.length} className="py-3 text-[#6B6B6B]">
                Пока пусто
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-[#2A2A2A]">
              {r.map((c, j) => (
                <td key={j} className={`py-2 ${j > 0 ? "text-right tabular-nums text-[#F5F5F5]" : "text-[#A0A0A0]"}`}>
                  {typeof c === "number" ? fmt(c) : c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period } = await searchParams;
  const days = (PERIODS as readonly number[]).includes(Number(period)) ? Number(period) : 30;

  const [metrika, crm] = await Promise.all([fetchMetrikaReport(days), Promise.resolve(getLeadsReport(days))]);

  const contacts = metrika.ok ? metrika.goals.filter((g) => g.group === "contact") : [];
  const contactsNow = contacts.reduce((a, g) => a + g.value, 0);
  const contactsPrev = contacts.reduce((a, g) => a + g.prev, 0);
  const channels = contactReport(days);
  const funnel = funnelReport(days);
  const counts = funnel.reduce((a,r) => ({visits:a.visits+r.visits, converted:a.converted+r.converted,
    enquiries:a.enquiries+r.enquiries, booked:a.booked+r.booked}), {visits:0,converted:0,enquiries:0,booked:0});
  const rate = (n: number,d: number) => d ? pct(100*n/d) : "—";

  function ranking(field: "source" | "landing") {
    const groups = new Map<string, typeof counts>();
    for (const row of funnel) {
      const group = groups.get(row[field]) ?? { visits: 0, converted: 0, enquiries: 0, booked: 0 };
      group.visits += row.visits;
      group.converted += row.converted;
      group.enquiries += row.enquiries;
      group.booked += row.booked;
      groups.set(row[field], group);
    }
    return [...groups].sort((a,b) => b[1].booked-a[1].booked || b[1].enquiries-a[1].enquiries || b[1].visits-a[1].visits)
      .map(([label,g]) => [label,g.visits,g.enquiries,g.booked,rate(g.converted,g.visits),rate(g.booked,g.enquiries)]);
  }
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5]">Отчёт</h1>
          {metrika.ok && (
            <p className="mt-1 text-sm text-[#A0A0A0]">
              {dmy(metrika.date1)} — {dmy(metrika.date2)} · сравнение с {dmy(metrika.prevDate1)} — {dmy(metrika.prevDate2)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/admin/report?period=${p}`}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                p === days ? "border-[#CCFF00] bg-[#CCFF00]/15 text-[#CCFF00]" : "border-[#333333] text-[#A0A0A0] hover:text-[#F5F5F5]"
              }`}
            >
              {p} дней
            </Link>
          ))}
        </div>
      </div>

      <Section title="От визита до записи в студию">
        <p className="mb-4 text-sm text-[#A0A0A0]">По визитам, начавшимся за последние {days} дней. Страница и источник фиксируются при входе. Новый визит начинается в новой сессии вкладки, после 30 минут без активности или при смене рекламной кампании.</p>
        <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Tile label="Визиты сайта" value={fmt(counts.visits)} />
          <Tile label="Визиты с заявкой" value={fmt(counts.converted)} hint={rate(counts.converted,counts.visits) + " от визитов"} />
          <Tile label="Уникальные клиенты" value={fmt(counts.enquiries)} />
          <Tile label="Записаны в студию" value={fmt(counts.booked)} hint={rate(counts.booked,counts.enquiries) + " от клиентов"} />
        </div>
        {funnel.length > 0 && <div className="my-5 space-y-4">
          {(["source","landing"] as const).map(field => <div key={field}>
            <h3 className="mb-2 font-semibold">{field === "source" ? "Какие источники приводят к записи" : "Какие страницы приводят к записи"}</h3>
            <Table head={[field === "source" ? "Источник" : "Страница входа","Визиты","Клиенты","Записи","Визит → обращение","Клиент → запись"]} rows={ranking(field)} />
          </div>)}
          <h3 className="font-semibold">По страницам, источникам и кампаниям</h3>
        </div>}
        {funnel.length ? <Table head={["Страница входа","Источник","Канал","Кампания","Визиты","С заявкой","Визит → обращение","Клиенты","Записи","Клиент → запись"]}
          rows={funnel.map(r=>[r.landing,r.source,r.medium || "—",r.campaign || "—",r.visits,r.converted,rate(r.converted,r.visits),r.enquiries,r.booked,rate(r.booked,r.enquiries)])} />
          : <p>За этот период отслеженных визитов пока нет.</p>}
        <h3 className="mt-5 mb-2 font-semibold">Звонки и переписки за период</h3>
        <Table head={["Канал","Нажатия","Подтверждённые клиенты","Записались после контакта"]} rows={channels.map(c=>[c.channel,c.clicks,c.clients,c.booked])} />
        <Link className="inline-block py-3 underline" href="/admin/leads/new">Подтвердить звонок или сообщение</Link>
        <p className="text-sm text-[#A0A0A0]">В общей воронке один телефон считается одним клиентом за период. Источник получает первый подтверждённый контакт с известным визитом. Контакты без привязки показаны отдельно. Каждый визит с подтверждённым обращением учитывается в конверсии своего визита. В разбивке по каналам один клиент может встретиться в нескольких строках.</p>
        <p className="mt-3 text-sm text-[#A0A0A0]">После согласования даты и времени поставьте заявке статус «Записан в студию». Первая запись сохранится при смене статуса. Само нажатие не подтверждает обращение.</p>
      </Section>

      {!metrika.ok && (
        <div className="rounded-xl border border-[#FFB020]/40 bg-[#FFB020]/10 p-4 text-sm text-[#FFB020]">
          Данные Метрики недоступны: {metrika.error}. Заявки из CRM ниже показаны без неё.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Визиты" value={metrika.ok ? fmt(metrika.totals.visits) : "—"} now={metrika.ok ? metrika.totals.visits : undefined} prev={metrika.ok ? metrika.prevTotals.visits : undefined} />
        <Tile label="Посетители" value={metrika.ok ? fmt(metrika.totals.users) : "—"} now={metrika.ok ? metrika.totals.users : undefined} prev={metrika.ok ? metrika.prevTotals.users : undefined} />
        <Tile label="Обращения напрямую" value={metrika.ok ? fmt(contactsNow) : "—"} now={metrika.ok ? contactsNow : undefined} prev={metrika.ok ? contactsPrev : undefined} hint="телефон + мессенджеры" />
        <Tile label="Заявки в CRM" value={fmt(crm.total)} now={crm.total} prev={crm.prevTotal} hint="формы, квиз, коллбэк" />
        <Tile label="Отказы" value={metrika.ok ? pct(metrika.totals.bounceRate) : "—"} now={metrika.ok ? metrika.totals.bounceRate : undefined} prev={metrika.ok ? metrika.prevTotals.bounceRate : undefined} invert />
        <Tile label="Время на сайте" value={metrika.ok ? dur(metrika.totals.avgDuration) : "—"} now={metrika.ok ? metrika.totals.avgDuration : undefined} prev={metrika.ok ? metrika.prevTotals.avgDuration : undefined} hint="мин:сек за визит" />
        <Tile label="Просмотры страниц" value={metrika.ok ? fmt(metrika.totals.pageviews) : "—"} now={metrika.ok ? metrika.totals.pageviews : undefined} prev={metrika.ok ? metrika.prevTotals.pageviews : undefined} />
      </div>

      {metrika.ok && (
        <Section title="Визиты по дням">
          <Bars points={metrika.daily.map((d) => ({ date: d.date, value: d.visits }))} unit="Визиты" />
          <div className="mt-1 flex justify-between text-[10px] text-[#6B6B6B]">
            <span>{dm(metrika.date1)}</span>
            <span>{dm(metrika.date2)}</span>
          </div>
        </Section>
      )}

      {metrika.ok && (
        <Section title="Клики и цели из Метрики" aside={<span className="text-xs text-[#6B6B6B]">счётчик {"108387254"}</span>}>
          <div className="grid gap-6 lg:grid-cols-3">
            {(["contact", "funnel", "lead"] as GoalGroup[]).map((group) => (
              <div key={group}>
                <p className="mb-2 text-xs uppercase tracking-wide text-[#6B6B6B]">{GROUP_TITLES[group]}</p>
                <ul className="divide-y divide-[#2A2A2A]">
                  {metrika.goals
                    .filter((g) => g.group === group)
                    .map((g) => (
                      <li key={g.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span className="text-[#A0A0A0]">{g.label}</span>
                        <span className="flex items-baseline gap-2">
                          <span className="tabular-nums text-[#F5F5F5]">{fmt(g.value)}</span>
                          <Delta now={g.value} prev={g.prev} />
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-[#6B6B6B]">
            «Обращения напрямую» — человек нажал номер или ушёл в мессенджер, заявки в CRM не создаётся. Заявки по целям и заявки в CRM ниже могут расходиться на единицы: цель считается на стороне браузера.
          </p>
        </Section>
      )}

      <Section
        title="Заявки в CRM"
        aside={
          <Link href="/admin/leads" className="text-sm text-[#00F0FF] hover:underline">
            Открыть заявки →
          </Link>
        }
      >
        <Bars points={crm.daily.map((d) => ({ date: d.date, value: d.count }))} unit="Заявки" />
        <div className="mt-1 flex justify-between text-[10px] text-[#6B6B6B]">
          <span>{dm(crm.daily[0]?.date ?? "")}</span>
          <span>{dm(crm.daily.at(-1)?.date ?? "")}</span>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-[#6B6B6B]">Откуда</p>
            <Table head={["Источник", "Заявок"]} rows={crm.bySource.map((s) => [s.label, s.count])} />
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-[#6B6B6B]">Статусы</p>
            <Table head={["Статус", "Заявок"]} rows={crm.byStatus.map((s) => [STATUS_LABELS[s.status] ?? s.status, s.count])} />
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-[#6B6B6B]">С каких страниц</p>
            <Table head={["Страница", "Заявок"]} rows={crm.byPage.map((p) => [p.page, p.count])} />
          </div>
        </div>
        {crm.webvisorCandidates > 0 && (
          <p className="mt-4 text-xs text-[#6B6B6B]">
            Ещё {fmt(crm.webvisorCandidates)} — кандидаты, восстановленные из Вебвизора без номера; в счёт периода не входят.
          </p>
        )}
      </Section>

      {metrika.ok && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Section title="Откуда трафик">
            <Table head={["Источник", "Визиты", "Люди"]} rows={metrika.sources.map((s) => [s.name, s.visits, s.users])} />
          </Section>
          <Section title="Устройства">
            <Table head={["Устройство", "Визиты"]} rows={metrika.devices.map((d) => [d.name, d.visits])} />
          </Section>
          <Section title="Страницы входа">
            <Table head={["Страница", "Визиты"]} rows={metrika.pages.map((p) => [p.url, p.visits])} />
          </Section>
        </div>
      )}

      <p className="text-xs text-[#6B6B6B]">Данные Метрики обновляются раз в 10 минут. Заявки — из базы сайта, без задержки.</p>
    </div>
  );
}
