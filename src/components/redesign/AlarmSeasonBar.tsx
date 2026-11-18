import Link from "next/link";
import { ArrowRight } from "@/components/ds/icons";
import { ALARM_HUB_URL, getAlarmLanding } from "@/lib/db/queries/alarm";

/**
 * Сезонная строка «сигнализации» — в стиле SeasonBar, ведёт на хаб.
 * Тексты — из посадочной автозапуска (overline + teaser в alarm_landings);
 * выключили её в админке — строка пропадает.
 */
export function getAlarmSeason(): { label: string; text: string; href: string } | null {
  const l = getAlarmLanding("avtozapusk");
  if (!l) return null;
  return { label: l.overline || l.navLabel, text: l.teaser || l.h1, href: ALARM_HUB_URL };
}

export default function AlarmSeasonBar() {
  const s = getAlarmSeason();
  if (!s) return null;
  return (
    <div className="border-b border-line" data-gate-new="сезон сигнализаций: строка на главной ведёт на хаб">
      <div className="ds-container py-3">
        <Link href={s.href} className="ds-focus group flex min-h-[44px] flex-wrap items-center gap-x-4 gap-y-1 rounded-sm text-body-sm">
          <span className="flex items-center gap-2.5 font-semibold text-ink">
            <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-pill bg-accent" />
            {s.label}
          </span>
          <span className="text-ink-secondary">{s.text}</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-accent">
            Подробнее
            <ArrowRight size={14} className="transition-transform duration-250 group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
