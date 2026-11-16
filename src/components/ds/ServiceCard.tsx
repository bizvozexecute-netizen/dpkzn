import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "./icons";
import { cn } from "@/lib/utils";

/**
 * Карточка услуги (ДС §4.2). Вся карточка — одна ссылка: заголовок отдельным
 * линком дал бы два <a> на один и тот же URL и лишний пункт в озвучке скринридера.
 *
 * Ч/б → цвет на hover: машина остаётся самым светлым пятном экрана только там,
 * куда человек смотрит (принцип 1 ДС).
 */
interface ServiceCardProps {
  href: string;
  title: string;
  priceFrom?: string | null;
  /** Короткое описание услуги — переносится из текущего блока перелинковки */
  tagline?: string | null;
  /** Подпись у стрелки. В блоке перелинковки она есть на текущем сайте */
  cta?: string;
  image?: string;
  className?: string;
}

export default function ServiceCard({ href, title, priceFrom, tagline, cta, image, className }: ServiceCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "ds-focus ds-card-glow group flex flex-col rounded-lg border border-line bg-surface p-4 md:p-6",
        "transition-[transform,border-color,box-shadow] duration-400 ease-out",
        "md:hover:scale-[1.03] md:hover:border-line-strong md:hover:shadow-card-hover",
        "active:scale-100",
        className,
      )}
    >
      {image && (
        <div className="relative mb-4 aspect-[3/2] overflow-hidden rounded-md bg-elevated">
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 768px) 45vw, 300px"
            className="object-cover grayscale-[40%] transition-[filter] duration-400 ease-out md:group-hover:grayscale-0"
          />
        </div>
      )}

      <h3 className="font-display text-h4 text-ink">{title}</h3>
      {tagline && <p className="mt-2 text-body-sm text-ink-secondary">{tagline}</p>}

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <span className="flex flex-wrap items-baseline gap-x-3">
          {priceFrom && <span className="ds-nums text-caption text-ink-secondary">{priceFrom}</span>}
          {cta && <span className="text-caption text-ink-secondary">{cta}</span>}
        </span>
        <ArrowRight
          size={20}
          className="flex-shrink-0 text-ink-tertiary transition-transform duration-400 ease-out md:group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}
