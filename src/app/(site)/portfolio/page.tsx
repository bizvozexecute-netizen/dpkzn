import type { Metadata } from "next";
import { getPortfolioItems } from "@/lib/db/queries/content";
import { getAllServices, getCarClassesForPricing } from "@/lib/db/queries/services";
import { getSettings } from "@/lib/db/queries/settings";
import { KEY_SERVICE_SLUGS } from "@/lib/redesign/quiz-presets";
import Breadcrumbs from "@/components/ds/Breadcrumbs";
import PortfolioGrid from "@/components/redesign/PortfolioGrid";
import HomeQuizSection from "@/components/redesign/HomeQuizSection";
import PortfolioTracker from "./PortfolioTracker";

export const metadata: Metadata = {
  title: "Портфолио работ — детейлинг в Казани | Detailing Place",
  description: "Примеры наших работ: антигравийная плёнка, полировка, керамика, тонировка, Bi-LED линзы. Фото до и после.",
  openGraph: {
    title: "Портфолио работ — детейлинг в Казани | Detailing Place",
    description: "Примеры наших работ: антигравийная плёнка, полировка, керамика, тонировка, Bi-LED линзы. Фото до и после.",
    url: "https://dpkzn.ru/portfolio",
  },
  alternates: { canonical: "https://dpkzn.ru/portfolio" },
};

/** Акцентные работы — на две колонки сетки (03-template-portfolio.md §3). */
const WIDE_SLUGS = ["rolls-royce-cullinan-ppf", "lamborghini-urus-ppf"];

export default function PortfolioPage() {
  const items = getPortfolioItems();
  // Теги — из показанных работ, а не из всей таблицы: у примеров работ услуг
  // (slug = null) свои теги, чип по ним давал бы пустую выдачу.
  const allTags = [...new Set(items.flatMap((i) => i.tags))];
  const settings = getSettings();

  const all = getAllServices();
  const bySlug = new Map(all.map((s) => [s.slug, s]));
  const quizOptions = [
    ...KEY_SERVICE_SLUGS.map((slug) => bySlug.get(slug))
      .filter((s) => s !== undefined)
      .map((s) => {
        const title = s.h1.replace(/ в Казани.*/, "").replace(/ — .*/, "");
        return { value: title, label: title };
      }),
    { value: "Другое", label: "Другое" },
  ];

  return (
    <>
      <PortfolioTracker />
      <section className="pb-4 pt-28 md:pt-40">
        <div className="ds-container">
          <Breadcrumbs items={[{ label: "Портфолио" }]} className="mb-6" />
          <h1 className="font-display text-h1 text-ink">Портфолио</h1>
          <p className="mt-3 max-w-[56ch] text-body text-ink-secondary">
            Примеры наших работ — фото до и после
          </p>

          <PortfolioGrid
            items={items.map((i) => ({
              slug: i.slug,
              car: i.car,
              serviceName: i.serviceName ?? null,
              tags: i.tags,
              image: i.image,
            }))}
            allTags={allTags}
            wideSlugs={WIDE_SLUGS}
          />
        </div>
      </section>

      <div data-gate-new="CTA-блок с квизом вместо двух форм списка портфолио (ТЗ портфолио §4)">
        <HomeQuizSection
          serviceSlug="portfolio"
          title="Хотите так же?"
          lead="Рассчитаем стоимость"
          note="Оплатим такси при заказе от 15 000 ₽"
          options={quizOptions}
          carClasses={getCarClassesForPricing()}
          whatsappUrl={settings.whatsapp_url || "https://wa.me/79196449393"}
          telegramUrl={settings.telegram_url || "https://t.me/+79196449393"}
        />
      </div>
    </>
  );
}
