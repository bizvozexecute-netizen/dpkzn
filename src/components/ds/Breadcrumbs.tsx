import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Крошки Dark Studio + разметка BreadcrumbList.
 *
 * Разметка отдаётся тем же компонентом, что и видимые ссылки: если их держать
 * порознь, они рано или поздно разъезжаются, и Вебмастер ловит ошибку структуры.
 */
export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

const HOME: Crumb = { label: "Главная", href: "/" };

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const chain = [HOME, ...items];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: chain.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `https://dpkzn.ru${c.href}` } : {}),
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Хлебные крошки" className={cn("text-caption text-ink-secondary", className)}>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {chain.map((c, i) => (
            <li key={c.label} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true">/</span>}
              {c.href && i < chain.length - 1 ? (
                <Link
                  href={c.href}
                  // -my съедает добавленную высоту: тап-зона 44px без раздутых крошек
                  className="ds-focus -my-2.5 inline-flex items-center rounded-sm py-2.5 transition-colors duration-150 hover:text-ink"
                >
                  {c.label}
                </Link>
              ) : (
                <span aria-current={i === chain.length - 1 ? "page" : undefined}>{c.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
