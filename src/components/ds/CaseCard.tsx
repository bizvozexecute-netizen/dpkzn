import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Карточка кейса в сетке портфолио (03-template-portfolio.md §3).
 *
 * Фото 4:3 со скримом, марка дисплейным шрифтом, услуга и теги — вторым
 * планом. Акцентные работы (Rolls, Lambo) растягиваются на две колонки.
 */
interface CaseCardProps {
  href: string;
  car: string;
  serviceName?: string | null;
  tags: string[];
  image: string;
  /** Акцентная карточка — две колонки сетки */
  wide?: boolean;
  /** Первая карточка списка — кандидат LCP, грузится сразу */
  priority?: boolean;
  className?: string;
}

export default function CaseCard({ href, car, serviceName, tags, image, wide, priority, className }: CaseCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "ds-focus ds-card-glow group relative block overflow-hidden rounded-lg border border-line",
        wide ? "aspect-[4/3] sm:col-span-2 sm:aspect-[8/3.2]" : "aspect-[4/3]",
        className,
      )}
    >
      <Image
        src={image}
        alt={`${car} — ${serviceName ?? tags.join(", ")}`}
        fill
        priority={priority}
        sizes={wide ? "(max-width: 768px) 100vw, 1200px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"}
        className="object-cover transition-transform duration-400 ease-out md:group-hover:scale-[1.06]"
      />
      <div className="ds-hero-scrim absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
        <p className="font-display text-h4 text-ink">{car}</p>
        {serviceName && <p className="mt-1 text-body-sm text-ink-secondary">{serviceName}</p>}
        {tags.length > 0 && (
          <p className="mt-1.5 text-caption text-ink-tertiary">{tags.join(" · ")}</p>
        )}
      </div>
    </Link>
  );
}
