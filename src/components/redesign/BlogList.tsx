"use client";

import { useEffect, useState } from "react";
import ArticleCard from "@/components/ds/ArticleCard";
import { cn } from "@/lib/utils";

/**
 * Лента блога с фильтром категорий (03-template-blog.md §1–3).
 *
 * Свежая статья — горизонтальный featured-разворот, остальные — сетка в три
 * колонки. Фильтр клиентский, зеркалится в ?filter= — как в портфолио.
 */
export interface BlogListItem {
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  /** Дата в формате «10 июня 2026 г.» — как на странице статьи */
  dateLabel: string;
  readingMinutes: number;
}

interface BlogListProps {
  items: BlogListItem[];
  categories: string[];
}

const ALL = "Все";

export default function BlogList({ items, categories }: BlogListProps) {
  const [active, setActive] = useState(ALL);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("filter");
    if (fromUrl && categories.includes(fromUrl)) setActive(fromUrl);
    // Фильтр из адресной строки нужен один раз, при открытии ссылки
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (category: string) => {
    setActive(category);
    const url = new URL(window.location.href);
    if (category === ALL) url.searchParams.delete("filter");
    else url.searchParams.set("filter", category);
    window.history.replaceState(null, "", url);
  };

  const filtered = active === ALL ? items : items.filter((i) => i.category === active);
  const [featured, ...rest] = filtered;

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-2">
        {[ALL, ...categories].map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => pick(category)}
            aria-pressed={category === active}
            className={cn(
              "ds-focus h-11 rounded-pill border px-4 text-body-sm transition-colors duration-150",
              category === active
                ? "border-accent bg-accent-subtle text-accent"
                : "border-line text-ink-secondary hover:border-line-strong hover:text-ink",
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {featured && (
        <ArticleCard
          featured
          priority
          href={`/blog/${featured.slug}`}
          title={featured.title}
          category={featured.category}
          date={featured.dateLabel}
          readingMinutes={featured.readingMinutes}
          excerpt={featured.excerpt}
          image={featured.image}
          className="mt-10"
        />
      )}

      <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((post) => (
          <ArticleCard
            key={post.slug}
            href={`/blog/${post.slug}`}
            title={post.title}
            category={post.category}
            date={post.dateLabel}
            readingMinutes={post.readingMinutes}
            excerpt={post.excerpt}
            image={post.image}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-10 text-body text-ink-secondary">
          В этой категории пока пусто.{" "}
          <button type="button" onClick={() => pick(ALL)} className="ds-focus rounded-sm text-accent hover:underline">
            Показать всё
          </button>
        </p>
      )}
    </>
  );
}
