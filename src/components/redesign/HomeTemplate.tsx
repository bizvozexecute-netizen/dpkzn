import type { Review } from "@/lib/types";
import HeroHome from "@/components/ds/HeroHome";
import ServicesPicker from "./ServicesPicker";
import ReviewsRail from "@/components/ds/ReviewsRail";
import SeoProse from "@/components/ds/SeoProse";
import AnatomySection from "./AnatomySection";
import ServicesGridSection, { type ServiceGridItem } from "./ServicesGridSection";
import PortfolioShowcase, { type ShowcaseItem } from "./PortfolioShowcase";
import HomeQuizSection from "./HomeQuizSection";
import Reveal from "@/components/ds/Reveal";
import SeasonBar from "@/components/ds/SeasonBar";
import LeadFormSection from "@/components/ds/LeadFormSection";
import { seasonIsLive } from "@/lib/redesign/season";
import type { CarClass, SeasonalOfferData } from "@/lib/types";

/**
 * Главная (03-template-home.md). Порядок секций и все тексты — из текущей
 * главной; новыми являются только «Анатомия», витрина портфолио и лента
 * отзывов, и каждый из этих блоков помечен в разметке причиной появления.
 */

interface HomeTemplateProps {
  h1: string;
  lead: string;
  hero: { poster: string; videoBase: string | null };
  facts: { value: string; label: string }[];
  rating: string;
  reviewCount: number;
  heroBadges: string[];
  advantages: { title: string; description: string }[];
  services: { title: string; lead: string; primary: ServiceGridItem[]; rest: ServiceGridItem[] };
  works: ShowcaseItem[];
  reviews: Review[];
  carClasses: CarClass[];
  quiz: { title: string; lead: string; options: { value: string; label: string }[] };
  seoHtml: string;
  allReviewsUrl: string;
  whatsappUrl: string;
  telegramUrl: string;
  maxUrl: string;
  /** Сезонная акция из БД; null — строки и подписи пресета нет */
  season?: SeasonalOfferData | null;
}

export default function HomeTemplate({
  h1,
  lead,
  hero,
  facts,
  rating,
  reviewCount,
  heroBadges,
  advantages,
  services,
  works,
  reviews,
  carClasses,
  quiz,
  seoHtml,
  allReviewsUrl,
  whatsappUrl,
  telegramUrl,
  maxUrl,
  season,
}: HomeTemplateProps) {
  return (
    <>
      <HeroHome
        h1={h1}
        lead={lead}
        poster={hero.poster}
        videoBase={hero.videoBase}
        whatsappUrl={whatsappUrl}
        maxUrl={maxUrl}
        telegramUrl={telegramUrl}
        carClasses={carClasses}
        facts={facts}
        rating={rating}
        reviewCount={reviewCount}
        mapsUrl={allReviewsUrl}
        badges={heroBadges}
      />

      {/* Сезон: одна строка под hero, ведёт к пресету «зоны риска» в анатомии */}
      {seasonIsLive(season) && <SeasonBar offer={season} href="#anatomy" />}

      {/* Второй блок — выбор задачи с ценой вместо бегущей строки (владелец
          23.09.2026: «второй блок тоже слова»). Цены — отличие от всех
          конкурентов из топа: у них на главной цен нет. */}
      <ServicesPicker items={services.primary} />

      <section className="ds-section-sm ds-defer-layout">
        <div className="ds-container grid gap-6 md:grid-cols-3">
          {advantages.map((a, i) => (
            <Reveal key={a.title} delay={i * 80}>
              <div className="h-full rounded-lg border border-line bg-surface p-6">
                <span aria-hidden="true" className="block h-1 w-8 rounded-pill bg-accent" />
                <h2 className="mt-4 font-display text-h4 text-ink">{a.title}</h2>
                <p className="mt-2 text-body-sm text-ink-secondary">{a.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <AnatomySection carClasses={carClasses} season={season} />

      <ServicesGridSection
        title={services.title}
        lead={services.lead}
        primary={services.primary}
        rest={services.rest}
      />

      {/* Захват там, где человек уже заинтересован (владелец 23.09.2026: «мы не
          везде забираем телефон»). У конкурента Урбан на главной пять форм с
          телефоном, у нас была одна видимая на 8-м экране. */}
      <LeadFormSection
        source="after-services"
        gateNote="захват после списка услуг: не нашёл свою задачу — назови, посчитаем (владелец 23.09.2026)"
        heading="Не нашли свою задачу?"
        lead="Назовите автомобиль и что беспокоит — посчитаем и перезвоним."
        variant="expanded"
        carClasses={carClasses}
        submitLabel="Узнать цену"
        hint="Один звонок по вашему вопросу, без спама."
        messengers={{ whatsappUrl, telegramUrl, maxUrl }}
      />

      <PortfolioShowcase items={works} />

      <LeadFormSection
        source="after-portfolio"
        gateNote="захват после портфолио: «хочу так же» (владелец 23.09.2026)"
        heading="Хотите так же?"
        lead="Оставьте номер — перезвоним, расскажем, что подойдёт вашему автомобилю, и назовём цену."
        submitLabel="Перезвоните мне"
        submitLabelShort="Перезвоните"
        hint="Перезвоним."
        messengers={{ whatsappUrl, telegramUrl, maxUrl }}
      />

      <section
        className="ds-section ds-numbered ds-defer-layout"
        data-gate-new="лента отзывов на главной (ТЗ главной §7): раньше блок дорисовывался скриптом и в разметку не попадал"
      >
        <div className="ds-container relative">
          <span aria-hidden="true" className="ds-secnum" />
          <Reveal variant="line">
            <h2 className="font-display text-h2 text-ink">Отзывы клиентов</h2>
          </Reveal>
          <div className="mt-10">
            <ReviewsRail reviews={reviews} allReviewsUrl={allReviewsUrl} rating={rating} />
          </div>
        </div>
      </section>

      <HomeQuizSection
        title={quiz.title}
        lead={quiz.lead}
        options={quiz.options}
        carClasses={carClasses}
        whatsappUrl={whatsappUrl}
        telegramUrl={telegramUrl}
      />

      <section className="ds-section ds-defer-layout [--section-height:980px]">
        <div className="ds-container">
          <SeoProse html={seoHtml} />
        </div>
      </section>
    </>
  );
}
