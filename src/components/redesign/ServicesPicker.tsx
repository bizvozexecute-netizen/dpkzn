import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@/components/ds/icons";
import type { ServiceGridItem } from "./ServicesGridSection";

/**
 * Второй блок главной — выбор задачи с ценой (владелец 23.09.2026: «второй блок
 * тоже слова»). Раньше здесь была бегущая строка из 19 названий: она не отвечала
 * на вопрос «что мне нужно» и не показывала главное наше отличие — цены.
 * У всех четырёх конкурентов из топа цен на главной нет вовсе.
 *
 * Шесть самых ходовых услуг карточками: фото, название, цена «от». Телефон —
 * лента с прокруткой и снапом: сеткой 2×3 блок занял бы почти экран на странице,
 * которая и так длинная; видна полторы карточки — это приглашение листать.
 * Компьютер — шесть в ряд.
 *
 * Серверный, без клиентского JS. Картинки ленивые: блок ниже первого экрана.
 */
export default function ServicesPicker({ items }: { items: ServiceGridItem[] }) {
  const cards = items.slice(0, 6);
  if (cards.length === 0) return null;

  return (
    <section
      className="ds-section-sm"
      data-gate-new="выбор задачи с ценой вместо бегущей строки услуг (владелец 23.09.2026)"
    >
      <div className="ds-container">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-display text-h4 text-ink">С чем к нам приезжают</p>
          <Link
            href="#services"
            className="ds-focus flex-shrink-0 rounded-sm text-body-sm text-ink-secondary underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:text-ink"
          >
            Все услуги
          </Link>
        </div>

        <ul className="-mx-5 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-6">
          {cards.map((s) => (
            <li key={s.slug} className="w-[42%] min-w-[150px] flex-shrink-0 snap-start md:w-auto md:min-w-0">
              <Link
                href={s.href}
                className="ds-focus group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors duration-150 hover:border-line-strong"
              >
                <span className="relative block aspect-[4/3] overflow-hidden bg-elevated">
                  <Image
                    src={s.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 16vw, (min-width: 768px) 33vw, 42vw"
                    className="object-cover transition-transform duration-400 ease-out md:group-hover:scale-[1.05]"
                  />
                </span>
                <span className="flex flex-1 flex-col p-3 md:p-4">
                  <span className="text-body-sm font-semibold leading-snug text-ink">{s.title}</span>
                  <span className="mt-auto flex items-center justify-between gap-2 pt-2">
                    {s.priceFrom ? (
                      <span className="ds-nums text-body-sm text-accent">{s.priceFrom}</span>
                    ) : (
                      <span className="text-body-sm text-ink-secondary">Цена по фото</span>
                    )}
                    <ArrowRight
                      size={16}
                      className="flex-shrink-0 text-ink-tertiary transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink"
                    />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
