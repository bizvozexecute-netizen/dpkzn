import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@/components/ds/icons";
import { cn } from "@/lib/utils";

/**
 * Витрина портфолио на главной (03-template-home.md §6).
 *
 * Первая работа занимает две колонки и выше остальных: фото машины — главный
 * визуальный актив студии, мелкая равномерная сетка его обесценивает.
 */
export interface ShowcaseItem {
  slug: string;
  car: string;
  tags: string[];
  image: string;
}

export default function PortfolioShowcase({ items }: { items: ShowcaseItem[] }) {
  if (items.length === 0) return null;

  return (
    <section
      className="ds-section ds-beam ds-numbered"
      data-gate-new="витрина портфолио на главной (ТЗ главной §6): раньше блок дорисовывался скриптом и в разметку не попадал"
    >
      <div className="ds-container relative">
        <span aria-hidden="true" className="ds-secnum" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-h2 text-ink">Примеры наших работ</h2>
          <Link
            href="/portfolio"
            className="ds-focus inline-flex min-h-11 items-center gap-1.5 rounded-sm text-body-sm text-ink transition-colors duration-150 hover:text-accent"
          >
            Все работы
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {items.map((item, i) => (
            <Link
              key={item.slug}
              href={`/portfolio/${item.slug}`}
              className={cn(
                "ds-focus group relative overflow-hidden rounded-lg border border-line",
                i === 0 ? "md:col-span-2 md:h-[520px]" : "h-[380px]",
                i !== 0 && "h-[280px] md:h-[380px]",
              )}
            >
              <Image
                src={item.image}
                alt={`${item.car} — ${item.tags.join(", ")}`}
                fill
                sizes={i === 0 ? "(max-width: 768px) 100vw, 1200px" : "(max-width: 768px) 100vw, 600px"}
                className="object-cover transition-transform duration-400 ease-out md:group-hover:scale-[1.06]"
              />
              <div className="ds-hero-scrim absolute inset-0" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="font-display text-h4 text-ink">{item.car}</p>
                <p className="mt-1 text-caption text-ink-secondary">{item.tags.join(" · ")}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
