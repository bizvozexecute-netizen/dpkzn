import type { Metadata } from "next";
import { getAllServices, getCarClassesForPricing } from "@/lib/db/queries/services";
import { getSeasonalOffer, getSettings, getStats, getTrustBadges } from "@/lib/db/queries/settings";
import { getPortfolioItems, getVisibleReviews } from "@/lib/db/queries/content";
import { getHeroMedia } from "@/lib/redesign/hero-loops";
import { KEY_SERVICE_SLUGS } from "@/lib/redesign/quiz-presets";
import HomeTemplate from "@/components/redesign/HomeTemplate";
import type { ServiceGridItem } from "@/components/redesign/ServicesGridSection";

// Seasonal offers and admin-managed content must be evaluated on each request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Детейлинг в Казани — студия Detailing Place",
  description:
    "Детейлинг в Казани: антигравийная плёнка, оклейка, полировка и керамика, тонировка, антихром, химчистка, Bi-LED линзы. Расчёт по фото — звоните.",
  keywords: [
    "детейлинг казань",
    "детейлинг авто казань",
    "детейлинг студия казань",
    "детейлинг автомобиля казань",
    "детейлинг кузова казань",
    "автодетейлинг казань",
  ],
  openGraph: {
    title: "Детейлинг в Казани — студия Detailing Place",
    description:
      "Детейлинг-студия в Казани: плёнка, оклейка, полировка и керамика, тонировка, антихром, химчистка, Bi-LED линзы. Расчёт по фото.",
    url: "https://dpkzn.ru",
  },
  alternates: {
    canonical: "https://dpkzn.ru",
  },
};


const HOMEPAGE_SEO = `
<h2>Детейлинг-студия в Казани — Detailing Place</h2>
<p>Detailing Place — студия премиального автодетейлинга в Казани. Делаем детейлинг кузова и салона автомобиля под ключ: защита, восстановление блеска, уход и стайлинг. Работаем с премиальными материалами, в охраняемом боксе с видеонаблюдением, с фотоотчётом каждого этапа и гарантией на все работы.</p>
<h2>Услуги детейлинга в Казани</h2>
<p>В студии вы можете заказать <a href="/ppf">антигравийную плёнку (PPF)</a> и <a href="/broneplenka">бронирование кузова</a>, <a href="/oklejka-avto">оклейку авто плёнкой и смену цвета</a>, <a href="/polirovka">полировку кузова и керамическое покрытие</a>, <a href="/tonirovka">тонировку стёкол</a>, <a href="/antihrom">антихром</a>, <a href="/himchistka">химчистку салона</a>, <a href="/shumoizolyaciya">шумоизоляцию</a>, <a href="/ustanovka-linz">установку Bi-LED линз</a> и <a href="/detayling-kuzova">комплексный детейлинг кузова</a>. Для тех, кому неудобно приезжать, доступен <a href="/vyezdnoj-detayling">выездной детейлинг</a>.</p>
<h2>Почему выбирают Detailing Place</h2>
<p>Рассчитываем стоимость по фото, фиксируем толщину ЛКП до и после, используем сертифицированные материалы и даём гарантию. Десятки выполненных проектов на авто премиум-класса — от BMW и Mercedes до Porsche, Rolls-Royce и Lamborghini. Позвоните или оставьте заявку — ответим.</p>
`;

/** Восемь ключевых услуг сетки (03-template-home.md §5). */
const KEY_SERVICES: readonly string[] = KEY_SERVICE_SLUGS;

/** Витрина портфолио: первая работа занимает две колонки (ТЗ главной §6). */
const SHOWCASE = ["rolls-royce-cullinan-ppf", "lamborghini-urus-ppf", "porsche-cayenne-polish"];

const HERO_BADGES = ["Гарантия", "Фотоотчёт", "Оригинальные материалы"];

/** Название услуги без «в Казани…» — как в текущей сетке главной. */
function shortTitle(h1: string): string {
  return h1.replace(/ в Казани.*/, "").replace(/ — .*/, "");
}

export default function Home() {
  const all = getAllServices();
  const settings = getSettings();
  const reviews = getVisibleReviews();
  const stats = getStats();
  const badges = getTrustBadges();
  const portfolio = getPortfolioItems();

  const reviewCount = reviews.length;
  const avgRating = reviewCount
    ? Math.round((reviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount) * 10) / 10
    : 5;

  const toItem = (s: (typeof all)[number]): ServiceGridItem => {
    const raw = s.packages[0]?.classPrices[0];
    return {
      slug: s.slug,
      href: s.url,
      title: shortTitle(s.h1),
      tagline: s.subtitle.includes(". ") ? s.subtitle.split(". ")[0] : s.subtitle,
      priceFrom: raw ? `от ${raw.replace(/^от\s*/i, "")}` : null,
      image: `/images/hero/${s.slug}.webp`,
    };
  };

  const bySlug = new Map(all.map((s) => [s.slug, s]));
  const primary = KEY_SERVICES.map((slug) => bySlug.get(slug)).filter((s) => s !== undefined).map(toItem);
  const rest = all.filter((s) => !KEY_SERVICES.includes(s.slug)).map(toItem);

  const works = SHOWCASE.map((slug) => portfolio.find((w) => w.slug === slug))
    .filter((w) => w !== undefined)
    .map((w) => ({ slug: w.slug, car: w.car, tags: w.tags, image: w.image }));

  return (
    <HomeTemplate
      h1="Премиальный детейлинг в Казани"
      lead="Оригинальные материалы, гарантия и фотоотчёт. Работаем с Porsche, BMW, Mercedes, Lamborghini. Плёнка, полировка, керамика, тонировка, шумоизоляция, Bi-LED линзы."
      hero={getHeroMedia("home")}
      facts={stats.map((s) => ({ value: s.value, label: s.label }))}
      // Рейтинг карточки на Яндекс Картах, а не среднее по отзывам в базе сайта:
      // клиент сверяет с Картами, и расхождение «5.0 против 4,4» бьёт по доверию
      rating={settings.yandex_rating || avgRating.toFixed(1).replace(".", ",")}
      reviewCount={Number(settings.yandex_reviews) || reviewCount}
      heroBadges={HERO_BADGES}
      advantages={badges.map((b) => ({ title: b.title, description: b.description }))}
      services={{
        title: "Наши услуги",
        lead: `${all.length} направлений для защиты и преображения вашего автомобиля`,
        primary,
        rest,
      }}
      works={works}
      reviews={reviews}
      carClasses={getCarClassesForPricing()}
      season={getSeasonalOffer()}
      quiz={{
        title: "Рассчитайте стоимость",
        lead: "Оплатим дорогу до дома при заказе комплекса",
        options: [...primary.map((s) => ({ value: s.title, label: s.title })), { value: "Другое", label: "Другое" }],
      }}
      seoHtml={HOMEPAGE_SEO}
      allReviewsUrl={settings.yandex_maps_url || "https://yandex.ru/maps/org/detailing_place/49387442667/"}
      whatsappUrl={settings.whatsapp_url || "https://wa.me/79196449393"}
      maxUrl={settings.max_url || "https://max.ru/u/f9LHodD0cOJb1nvCzhGOn7VrR1YECugldH9tgKkPSFiRv5Jon9WWQ07xkF4"}
      telegramUrl={settings.telegram_url || "https://t.me/+79196449393"}
    />
  );
}
