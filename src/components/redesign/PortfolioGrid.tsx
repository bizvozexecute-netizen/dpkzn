"use client";

import { useEffect, useState } from "react";
import CaseCard from "@/components/ds/CaseCard";
import { cn } from "@/lib/utils";

/**
 * Сетка портфолио с клиентскими фильтрами (03-template-portfolio.md §2–3).
 *
 * Фильтр по тегам без перезагрузки; выбор зеркалится в ?filter=, чтобы
 * ссылку на подборку можно было отправить. Акцентные работы (Rolls, Lambo)
 * занимают две колонки, пока показаны все — в отфильтрованном списке из
 * пары работ растяжка выглядит дырами.
 */
export interface PortfolioGridItem {
  slug: string;
  car: string;
  serviceName?: string | null;
  tags: string[];
  image: string;
}

interface PortfolioGridProps {
  items: PortfolioGridItem[];
  allTags: string[];
  /** Слаги акцентных карточек на две колонки */
  wideSlugs: string[];
}

const ALL = "Все";

export default function PortfolioGrid({ items, allTags, wideSlugs }: PortfolioGridProps) {
  const [active, setActive] = useState(ALL);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("filter");
    if (fromUrl && allTags.includes(fromUrl)) setActive(fromUrl);
    // Фильтр из адресной строки нужен один раз, при открытии ссылки
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (tag: string) => {
    setActive(tag);
    const url = new URL(window.location.href);
    if (tag === ALL) url.searchParams.delete("filter");
    else url.searchParams.set("filter", tag);
    window.history.replaceState(null, "", url);
  };

  const filtered = active === ALL ? items : items.filter((i) => i.tags.includes(active));

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-2">
        {[ALL, ...allTags].map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => pick(tag)}
            aria-pressed={tag === active}
            className={cn(
              "ds-focus h-11 rounded-pill border px-4 text-body-sm transition-colors duration-150",
              tag === active
                ? "border-accent bg-accent-subtle text-accent"
                : "border-line text-ink-secondary hover:border-line-strong hover:text-ink",
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-10">
        {filtered.map((item, i) => (
          <CaseCard
            key={item.slug}
            href={`/portfolio/${item.slug}`}
            car={item.car}
            serviceName={item.serviceName}
            tags={item.tags}
            image={item.image}
            wide={active === ALL && wideSlugs.includes(item.slug)}
            // Верхняя карточка — LCP страницы: без priority она лежит в lazy
            // и LCP уезжает за 6 секунд
            priority={i === 0}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-10 text-body text-ink-secondary">
          По этому фильтру пока пусто.{" "}
          <button type="button" onClick={() => pick(ALL)} className="ds-focus rounded-sm text-accent hover:underline">
            Показать всё
          </button>
        </p>
      )}
    </>
  );
}
