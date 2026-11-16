"use client";

import { ChevronLeft, ChevronRight } from "./icons";

/**
 * Стрелки ленты отзывов — единственная клиентская часть блока.
 * Ленту находим по id, чтобы сам список остался серверным.
 */
export default function ReviewsNav({ railId }: { railId: string }) {
  const scrollBy = (dir: 1 | -1) => {
    document.getElementById(railId)?.scrollBy({ left: dir * 380, behavior: "smooth" });
  };

  return (
    <div className="hidden gap-2 md:flex">
      <button
        type="button"
        aria-label="Предыдущие отзывы"
        onClick={() => scrollBy(-1)}
        className="ds-focus flex h-11 w-11 items-center justify-center rounded-pill border border-line text-ink transition-colors duration-150 hover:border-line-strong"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        aria-label="Следующие отзывы"
        onClick={() => scrollBy(1)}
        className="ds-focus flex h-11 w-11 items-center justify-center rounded-pill border border-line text-ink transition-colors duration-150 hover:border-line-strong"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
