import type { Review } from "@/lib/types";
import ReviewCard from "./ReviewCard";
import ReviewsNav from "./ReviewsNav";
import { Star } from "./icons";

/**
 * Лента отзывов (ДС §4.11). Не автокарусель: отзывы читают, а не смотрят,
 * и уезжающий сам по себе текст читать невозможно. Скролл-снап + стрелки на
 * десктопе, свайп на мобайле.
 *
 * Серверный компонент — клиентскими остались только стрелки.
 */
interface ReviewsRailProps {
  reviews: Review[];
  /** Ссылка на карточку организации в Яндекс.Картах */
  allReviewsUrl: string;
  rating?: string;
}

const RAIL_ID = "ds-reviews-rail";

export default function ReviewsRail({ reviews, allReviewsUrl }: ReviewsRailProps) {
  if (reviews.length === 0) return null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-body-sm text-ink-secondary">
          <Star size={16} filled className="text-star" />
          <span>Отзывы о студии</span>
        </p>
        <div className="flex items-center gap-3">
          <a
            href={allReviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ds-focus inline-flex min-h-11 items-center rounded-sm text-body-sm text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:text-accent"
          >
            Все отзывы на Яндекс.Картах
          </a>
          <ReviewsNav railId={RAIL_ID} />
        </div>
      </div>

      <div
        id={RAIL_ID}
        className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:px-0"
      >
        {reviews.map((r, i) => (
          <div key={r.author + i} className="w-[300px] flex-shrink-0 snap-start md:w-[360px]">
            <ReviewCard
              id={`review-${i}`}
              name={r.author}
              text={r.text}
              rating={r.rating}
              date={r.date}
              car={r.car}
              source={r.source}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
