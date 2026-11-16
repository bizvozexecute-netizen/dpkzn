import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Карточка статьи (ДС §4.12).
 *
 * Заголовок на hover остаётся ink и получает подчёркивание, а не красится в акцент:
 * акцент бережём для CTA, иначе в ленте из 25 статей он перестаёт что-либо значить.
 */
function Heading({
  featured,
  className,
  children,
}: {
  featured?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return featured ? <h2 className={className}>{children}</h2> : <h3 className={className}>{children}</h3>;
}

interface ArticleCardProps {
  href: string;
  title: string;
  category?: string | null;
  date?: string | null;
  /** Время чтения в минутах — считается из объёма текста */
  readingMinutes?: number | null;
  /** Анонс — в ДС §4.12 его нет, но это индексируемый текст списка (правило 1:1) */
  excerpt?: string | null;
  image?: string | null;
  /** Первая карточка в списке блога: горизонтальная, фото 60% */
  featured?: boolean;
  /** Обложка featured — кандидат LCP списка, грузится сразу */
  priority?: boolean;
  className?: string;
}

export default function ArticleCard({
  href,
  title,
  category,
  date,
  readingMinutes,
  excerpt,
  image,
  featured,
  priority,
  className,
}: ArticleCardProps) {
  const meta = [date, readingMinutes ? `${readingMinutes} мин чтения` : null].filter(Boolean).join(" · ");

  return (
    <Link
      href={href}
      className={cn(
        "ds-focus ds-card-glow group block rounded-lg",
        featured && "md:grid md:grid-cols-5 md:items-center md:gap-8",
        className,
      )}
    >
      {image && (
        <div
          className={cn(
            "relative aspect-video overflow-hidden rounded-lg bg-elevated",
            featured && "md:col-span-3 md:aspect-[16/10]",
          )}
        >
          <Image
            src={image}
            alt=""
            fill
            priority={priority}
            sizes={featured ? "(max-width: 768px) 100vw, 60vw" : "(max-width: 768px) 100vw, 400px"}
            className="object-cover transition-transform duration-400 ease-out md:group-hover:scale-[1.06]"
          />
        </div>
      )}

      <div className={cn("pt-4", featured && "md:col-span-2 md:pt-0")}>
        {category && <p className="text-overline uppercase text-accent">{category}</p>}
        {/* Featured — h2, как у прежнего разворота свежей статьи: заголовок
            секции списка, и гейт проверяет его наличие именно как H2 */}
        <Heading
          featured={featured}
          className={cn(
            "mt-2 font-display text-ink decoration-line-strong underline-offset-4 md:group-hover:underline",
            featured ? "text-h3" : "text-h4 line-clamp-2",
          )}
        >
          {title}
        </Heading>
        {excerpt && (
          <p className={cn("mt-2 text-body-sm text-ink-secondary", !featured && "line-clamp-2")}>{excerpt}</p>
        )}
        {meta && <p className="mt-3 text-caption text-ink-secondary">{meta}</p>}
      </div>
    </Link>
  );
}
