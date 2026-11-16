import type { Metadata } from "next";
import { getBlogPosts, getBlogCategories } from "@/lib/db/queries/content";
import { readingMinutes } from "@/lib/redesign/blog";
import Breadcrumbs from "@/components/ds/Breadcrumbs";
import BlogList from "@/components/redesign/BlogList";

export const metadata: Metadata = {
  title: "Блог о детейлинге — статьи и советы | Detailing Place",
  description: "Полезные статьи о защите кузова, полировке, тонировке, уходе за автомобилем. Советы от специалистов Detailing Place.",
  openGraph: {
    title: "Блог о детейлинге — статьи и советы | Detailing Place",
    description: "Полезные статьи о защите кузова, полировке, тонировке, уходе за автомобилем. Советы от специалистов Detailing Place.",
    url: "https://dpkzn.ru/blog",
  },
  alternates: { canonical: "https://dpkzn.ru/blog" },
};

const formatDate = (date: string) => {
  const parsed = new Date(date);
  return isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" });
};

export default function BlogPage() {
  // Свежая статья уходит в featured-разворот; сортировка по дате уже в запросе
  const posts = getBlogPosts().map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    image: p.image,
    category: p.category,
    dateLabel: formatDate(p.date),
    readingMinutes: readingMinutes(p.content ?? p.excerpt),
  }));
  const categories = getBlogCategories();

  return (
    <section className="pb-16 pt-28 md:pb-24 md:pt-40">
      <div className="ds-container">
        <Breadcrumbs items={[{ label: "Блог" }]} className="mb-6" />
        <h1 className="font-display text-h1 text-ink">Блог</h1>
        <p className="mt-3 max-w-[56ch] text-body text-ink-secondary">
          Полезные статьи о детейлинге и уходе за автомобилем
        </p>

        {/* В старом списке вторая featured-статья выпадала из сетки: показывались
            29 из 30. ТЗ блога §3 — все статьи, поэтому появление её карточки
            здесь ожидаемо; потери по-прежнему ловятся гейтом. */}
        <div data-gate-new="лента блога: все статьи, включая скрывавшийся дубль featured (ТЗ блога §3)">
          <BlogList items={posts} categories={categories} />
        </div>
      </div>
    </section>
  );
}
