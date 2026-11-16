import { Star } from "./icons";
import { cn } from "@/lib/utils";

/**
 * Карточка отзыва (ДС §4.11).
 *
 * Серверный компонент: раскрытие длинного текста сделано на чекбоксе и CSS,
 * без состояния — шесть карточек отзывов не должны тащить за собой гидратацию.
 * Текст раскрывается на месте, а не в модалке: отзыв — доказательство, увод
 * в оверлей рвёт чтение ленты. Scale на hover не даём — текст от него дрожит.
 */
interface ReviewCardProps {
  /** Уникальный в пределах страницы — связывает чекбокс с подписью */
  id: string;
  name: string;
  text: string;
  rating?: number;
  date?: string | null;
  car?: string | null;
  source?: string;
  className?: string;
}

/** Инициалы для аватара — как в текущем блоке отзывов. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const LONG_TEXT = 240;

export default function ReviewCard({
  id,
  name,
  text,
  rating = 5,
  date,
  car,
  source = "Яндекс.Карты",
  className,
}: ReviewCardProps) {
  const expandable = text.length > LONG_TEXT;

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-lg border border-line bg-surface p-6 transition-colors duration-250 hover:border-line-strong",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-body font-semibold text-ink">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-pill border border-line text-caption text-ink-secondary"
          >
            {initials(name)}
          </span>
          {name}
        </p>
        {date && <span className="flex-shrink-0 text-caption text-ink-secondary">{date}</span>}
      </div>

      <div className="mt-2 flex gap-0.5" role="img" aria-label={`Оценка ${rating} из 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={14} filled={i < rating} className={i < rating ? "text-star" : "text-ink-tertiary"} />
        ))}
      </div>

      {expandable && <input type="checkbox" id={id} className="peer sr-only" />}
      <p className={cn("mt-4 text-body-sm text-ink-secondary", expandable && "line-clamp-5 peer-checked:line-clamp-none")}>
        {text}
      </p>
      {expandable && (
        <label
          htmlFor={id}
          className="ds-focus mt-1 inline-flex min-h-11 cursor-pointer items-center self-start rounded-sm text-caption text-ink transition-colors duration-150 hover:text-accent peer-checked:hidden"
        >
          Читать полностью
        </label>
      )}

      <div className="mt-auto flex items-center gap-2 pt-5 text-caption text-ink-secondary">
        <span className="rounded-sm border border-line px-2 py-1">{source}</span>
        {car && <span>{car}</span>}
      </div>
    </div>
  );
}
