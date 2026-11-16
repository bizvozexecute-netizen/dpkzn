import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPortfolioItemBySlug, getPortfolioNavigation } from "@/lib/db/queries/content";
import { getAllServices, getCarClassesForPricing } from "@/lib/db/queries/services";
import { getSettings } from "@/lib/db/queries/settings";
import { getCaseSpread } from "@/lib/redesign/cases";
import { KEY_SERVICE_SLUGS } from "@/lib/redesign/quiz-presets";
import { ChevronLeft, ChevronRight } from "@/components/ds/icons";
import Breadcrumbs from "@/components/ds/Breadcrumbs";
import GalleryLightbox from "@/components/ds/GalleryLightbox";
import CaseSpread from "@/components/redesign/CaseSpread";
import HomeQuizSection from "@/components/redesign/HomeQuizSection";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getPortfolioItemBySlug(slug);
  if (!item) return {};

  const title = `${item.car} — ${item.serviceName}`;
  return {
    // Город вместо слова «Портфолио»: короче и работает на локальный запрос
    // («полировка porsche казань»). 10 из 11 работ выпали из индекса 20.09.
    title: `${title} в Казани | Detailing Place`,
    description: `${item.car}: ${item.serviceName} в Казани. Фотоотчёт работы в студии Detailing Place.`,
    openGraph: {
      title: `${title} | Портфолио Detailing Place`,
      description: `${item.car}: ${item.serviceName} в Казани.`,
      url: `https://dpkzn.ru/portfolio/${slug}`,
      images: [{ url: `https://dpkzn.ru${item.image}` }],
    },
    alternates: {
      canonical: `https://dpkzn.ru/portfolio/${slug}`,
    },
  };
}

export default async function PortfolioDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const item = getPortfolioItemBySlug(slug);

  if (!item) notFound();

  const nav = getPortfolioNavigation(slug);
  const spread = getCaseSpread(slug);
  const settings = getSettings();

  const all = getAllServices();
  const bySlug = new Map(all.map((s) => [s.slug, s]));
  const quizOptions = [
    ...KEY_SERVICE_SLUGS.map((s) => bySlug.get(s))
      .filter((s) => s !== undefined)
      .map((s) => {
        const title = s.h1.replace(/ в Казани.*/, "").replace(/ — .*/, "");
        return { value: title, label: title };
      }),
    { value: "Другое", label: "Другое" },
  ];

  return (
    <>
      {spread ? (
        <CaseSpread data={spread} car={item.car} serviceName={item.serviceName} tags={item.tags} />
      ) : (
        <section className="pt-28 md:pt-40">
          <div className="ds-container">
            <Breadcrumbs
              items={[{ label: "Портфолио", href: "/portfolio" }, { label: item.car }]}
              className="mb-6"
            />

            {/* Марка вместе с работой: одно «Audi» в H1 Яндекс счёл
                малополезным, страница выпала из индекса 20.09.2026 */}
            <h1 className="font-display text-h1 text-ink">
              {item.serviceName ? `${item.car} — ${item.serviceName}` : item.car}
            </h1>

            {item.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span key={tag} className="rounded-pill border border-line px-3 py-1.5 text-caption text-ink-secondary">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <GalleryLightbox images={item.gallery} alt={`${item.car} — ${item.serviceName ?? "детейлинг"}`} />
          </div>
        </section>
      )}

      {/* Соседние кейсы */}
      <div className="ds-container">
        <div className="mt-12 flex items-center justify-between gap-4 border-t border-line pt-6">
          {nav.prev ? (
            <Link
              href={`/portfolio/${nav.prev.slug}`}
              className="ds-focus group flex min-h-11 items-center gap-2 rounded-sm text-ink-secondary transition-colors duration-150 hover:text-ink"
            >
              <ChevronLeft size={20} className="transition-transform group-hover:-translate-x-1" />
              <span className="text-left">
                <span className="block text-caption text-ink-tertiary">Назад</span>
                <span className="block text-body-sm font-semibold text-ink">{nav.prev.car}</span>
              </span>
            </Link>
          ) : (
            <div />
          )}

          <Link
            href="/portfolio"
            className="ds-focus flex min-h-11 items-center rounded-sm text-body-sm text-ink-secondary transition-colors duration-150 hover:text-ink"
          >
            Все работы
          </Link>

          {nav.next ? (
            <Link
              href={`/portfolio/${nav.next.slug}`}
              className="ds-focus group flex min-h-11 items-center gap-2 rounded-sm text-ink-secondary transition-colors duration-150 hover:text-ink"
            >
              <span className="text-right">
                <span className="block text-caption text-ink-tertiary">Далее</span>
                <span className="block text-body-sm font-semibold text-ink">{nav.next.car}</span>
              </span>
              <ChevronRight size={20} className="transition-transform group-hover:translate-x-1" />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>

      <HomeQuizSection
        serviceSlug={`portfolio/${slug}`}
        title="Хотите так же для вашего авто?"
        lead="Рассчитаем стоимость"
        note="Оплатим такси при заказе от 15 000 ₽"
        options={quizOptions}
        carClasses={getCarClassesForPricing()}
        whatsappUrl={settings.whatsapp_url || "https://wa.me/79196449393"}
        telegramUrl={settings.telegram_url || "https://t.me/+79196449393"}
      />
    </>
  );
}
