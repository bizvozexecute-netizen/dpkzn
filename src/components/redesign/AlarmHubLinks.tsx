import Link from "next/link";
import { ArrowRight } from "@/components/ds/icons";
import type { AlarmLanding } from "@/lib/db/queries/alarm";

/**
 * Блоки хаба /ustanovka-signalizacii: карточки посадочных из alarm_landings.
 * URL, title, description и H1 хаба не меняются — блок добавляется под шаблон.
 */
export default function AlarmHubLinks({ landings }: { landings: AlarmLanding[] }) {
  if (landings.length === 0) return null;
  return (
    <nav
      aria-labelledby="alarm-variants-title"
      className="ds-section-sm pb-safe"
      data-gate-new="сезон сигнализаций: посадочные под кластеры Wordstat"
    >
      <div className="ds-container">
        <h2 id="alarm-variants-title" className="font-display text-h2 text-ink">
          Подбор сигнализации
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {landings.map((l) => (
            <li key={l.slug}>
              <Link
                href={l.url}
                className="ds-focus group flex h-full min-h-[44px] flex-col rounded-lg border border-line bg-surface p-5 transition-colors duration-150 hover:border-accent"
              >
                <span className="flex items-center justify-between gap-3 font-semibold text-ink">
                  {l.navLabel}
                  <ArrowRight size={16} className="flex-shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
                </span>
                {l.teaser && <span className="mt-2 text-body-sm text-ink-secondary">{l.teaser}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
