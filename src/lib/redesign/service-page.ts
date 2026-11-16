import { getAllServices, getCarClassesForPricing, getService } from "@/lib/db/queries/services";
import { getVisibleReviews } from "@/lib/db/queries/content";
import { getSettings } from "@/lib/db/queries/settings";
import type { CarClass, Review, ServiceData } from "@/lib/types";
import { getHeroMedia, type HeroMedia } from "./hero-loops";
import { getQuizPreset, type QuizPreset } from "./quiz-presets";

/**
 * Контракт данных страницы услуги (03-template-service.md §0).
 *
 * Всё берётся из тех же таблиц, что и сейчас: редизайн меняет шаблон, а не
 * контент. Единственное новое поле — usp, оно живёт в service_usp и правится
 * из админки.
 */

export interface ServicePageData {
  service: ServiceData;
  carClasses: CarClass[];
  reviews: Review[];
  hero: HeroMedia;
  quiz: QuizPreset;
  related: { slug: string; href: string; title: string; tagline: string; priceFrom: string | null; image: string }[];
  crossSell?: { title: string; text: string; href: string; image: string };
  allReviewsUrl: string;
}

/** Название услуги без «в Казани…» — как в текущем блоке «Также вам может быть интересно». */
function shortTitle(h1: string): string {
  return h1.replace(/ в Казани.*/, "").replace(/ — .*/, "");
}

function priceFromOf(service: ServiceData): string | null {
  const raw = service.packages[0]?.classPrices[0];
  return raw ? `от ${raw.replace(/^от\s*/i, "")}` : null;
}

export function getServicePageData(slug: string): ServicePageData | null {
  const service = getService(slug);
  if (!service) return null;

  const all = getAllServices();
  const settings = getSettings();

  // Порядок и количество — те же, что у текущего RelatedServices: первые три
  // активные услуги по sortOrder, кроме текущей. Перелинковка переносится 1:1.
  const related = all
    .filter((s) => s.slug !== slug)
    .slice(0, 3)
    .map((s) => ({
      slug: s.slug,
      href: s.url,
      title: shortTitle(s.h1),
      tagline: s.subtitle,
      priceFrom: priceFromOf(s),
      image: `/images/hero/${s.slug}.webp`,
    }));

  const crossSellTarget = service.crossSell
    ? all.find((s) => s.url === service.crossSell?.href)
    : undefined;

  return {
    service,
    carClasses: getCarClassesForPricing(),
    reviews: getVisibleReviews(),
    hero: getHeroMedia(slug),
    quiz: getQuizPreset(slug, service.packages),
    related,
    crossSell:
      service.crossSell && crossSellTarget
        ? {
            title: service.crossSell.title,
            // Описание переносим как есть — оно про смысл связки, а не про акцию.
            // Заменяем только там, где в тексте сидит скидка: проценты по ТЗ уходят.
            text: /скидк|\d+\s*%/i.test(service.crossSell.description)
              ? `С этой услугой заказывают: ${shortTitle(crossSellTarget.h1)}`
              : service.crossSell.description,
            href: service.crossSell.href,
            image: `/images/hero/${crossSellTarget.slug}.webp`,
          }
        : undefined,
    allReviewsUrl: settings.yandex_maps_url || "https://yandex.ru/maps/org/detailing_place/49387442667/",
  };
}
