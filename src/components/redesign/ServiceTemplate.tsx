import Image from "next/image";

import dynamic from "next/dynamic";
import type { ServicePageData } from "@/lib/redesign/service-page";
import HeroService from "@/components/ds/HeroService";
import PriceTable from "@/components/ds/PriceTable";
import BeforeAfter from "@/components/ds/BeforeAfter";
import ProcessTimeline from "@/components/ds/ProcessTimeline";
import ServiceQuizSection from "@/components/redesign/ServiceQuizSection";
import Faq from "@/components/ds/Faq";
import ReviewsRail from "@/components/ds/ReviewsRail";
import SeoProse from "@/components/ds/SeoProse";
import ServiceCard from "@/components/ds/ServiceCard";
import CrossSell from "@/components/ds/CrossSell";
import Reveal from "@/components/ds/Reveal";
import SeasonBar from "@/components/ds/SeasonBar";
import { SEASON_HREF, seasonIsLive } from "@/lib/redesign/season";
import type { SeasonalOfferData } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Шаблон страницы услуги (03-template-service.md §1). Один на все 19 услуг,
 * вариации задаются данными: hero-луп, модель прайса, конфиг квиза, флаги
 * before/after и кросс-селла.
 *
 * Порядок секций и все заголовки — как на текущем сайте: редизайн меняет
 * подачу, но ни один текст не переписывается.
 */

/**
 * Уникальные интерактивы трёх услуг переносятся как есть (ТЗ §4): замер микрон
 * ЛКП на /polirovka, сравнение процентов затемнения на /tonirovka, марки под
 * линзы на /ustanovka-linz. Подключаются динамически — их framer-motion не
 * должен попадать в бандл остальных шестнадцати страниц.
 */
const UNIQUE_BLOCKS: Record<string, React.ComponentType> = {
  PhotoComparison: dynamic(() => import("@/components/sections/PhotoComparison")),
  CarBrandGrid: dynamic(() => import("@/components/sections/CarBrandGrid")),
  BrandsGrid: dynamic(() => import("@/components/sections/BrandsGrid")),
  PaintDepthLab: dynamic(() => import("@/components/sections/PaintDepthLab")),
};

interface ServiceTemplateProps {
  /** Сезонная акция из БД; null — строки нет */
  season?: SeasonalOfferData | null;
  data: ServicePageData;
  whatsappUrl: string;
  telegramUrl: string;
}

function Section({
  id,
  title,
  lead,
  deferredClass,
  wide,
  light,
  children,
}: {
  id?: string;
  title?: string;
  lead?: string;
  deferredClass?: string;
  wide?: boolean;
  /** Свет сцены: scene — прожектор+отсвет, beam — диагональная полоса софтбокса */
  light?: "scene" | "beam";
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn("ds-section ds-numbered", deferredClass && "ds-defer-layout", deferredClass, light === "scene" && "ds-scene", light === "beam" && "ds-beam")}
    >
      <div className="ds-container relative">
        {/* Порядковый номер секции — CSS-контент, в гейт не попадает */}
        <span aria-hidden="true" className="ds-secnum" />
        {title && (
          <Reveal variant="line">
            <h2 className="font-display text-h2 text-ink">{title}</h2>
            {lead && <p className="mt-3 max-w-[56ch] text-body text-ink-secondary">{lead}</p>}
          </Reveal>
        )}
        <div className={title ? "mt-10" : undefined}>{wide ? children : children}</div>
      </div>
    </section>
  );
}

export default function ServiceTemplate({ data, whatsappUrl, telegramUrl, season }: ServiceTemplateProps) {
  const { service, carClasses, reviews, hero, quiz, related, crossSell, allReviewsUrl } = data;
  const UniqueBlock = service.uniqueBlock ? UNIQUE_BLOCKS[service.uniqueBlock] : undefined;
  // Бейдж показан оверлайном над H1 — в строке фактов его не повторяем.
  const uspWithoutBadge = service.usp.filter((u) => u !== service.badge);

  const faqJsonLd =
    service.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: service.faq.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  return (
    <>
      <HeroService
        overline={service.badge}
        h1={service.h1}
        lead={service.subtitle}
        usp={uspWithoutBadge}
        poster={hero.poster}
        videoBase={hero.videoBase}
        photoFirst={service.slug === "ppf"}
        worksHref={service.slug === "ppf" ? "#ppf-work" : "/portfolio"}
        carClasses={carClasses}
        messengers={{ whatsappUrl, telegramUrl }}
        // Страница-мост: заявки с антикора видно в отчёте отдельной строкой —
        // сколько людей из поиска по антикору ушло в плёнку и керамику
        leadSource={service.slug === "antikor" ? "antikor-bridge" : "hero:service"}
      />

      {/* Сезон — одной строкой между hero и прайсом, ведёт к расчёту сезонной услуги */}
      {seasonIsLive(season) && <SeasonBar offer={season} href={`${SEASON_HREF}#quiz`} compact />}

      <Section title="Стоимость услуг" lead={service.h1} light="beam">
        <PriceTable
          packages={service.packages}
          carClasses={carClasses}
          elementPrices={service.elementPrices}
          classHint="Не знаете класс автомобиля? При расчёте укажите марку и модель."
        />
      </Section>

      {service.slug === "ppf" && (
        <Section id="ppf-work" title="Пример полной оклейки кузова">
          <a href="/portfolio/rolls-royce-cullinan-ppf" className="ds-focus block max-w-xl rounded-lg">
            <Image src="/images/portfolio/gallery/rolls-royce-IMG_3858.webp" alt="Rolls-Royce Cullinan в студии Detailing Place" width={640} height={360} sizes="(max-width: 640px) 100vw, 576px" className="aspect-video w-full rounded-lg object-cover" />
            <span className="mt-3 block text-body text-ink underline">Rolls-Royce Cullinan — посмотреть, как оклеили кузов целиком</span>
          </a>
          <a href="#quiz" className="ds-focus inline-block py-3 text-body-sm text-ink underline">Рассчитать оклейку моего автомобиля</a>
        </Section>
      )}

      {service.hasBeforeAfter && service.beforeAfter && (
        <Section title="До и после">
          <BeforeAfter
            before={service.beforeAfter.before}
            after={service.beforeAfter.after}
            beforeLabel={service.beforeAfter.beforeLabel}
            afterLabel={service.beforeAfter.afterLabel}
            alt={service.h1}
          />
        </Section>
      )}

      {UniqueBlock && <UniqueBlock />}

      {service.process.length > 0 && (
        <Section title="Как мы работаем" deferredClass="[--section-height:860px]">
          <ProcessTimeline steps={service.process} />
        </Section>
      )}

      <ServiceQuizSection
        slug={service.slug}
        serviceName={service.h1}
        carClasses={carClasses}
        preset={quiz}
        whatsappUrl={whatsappUrl}
        telegramUrl={telegramUrl}
      />

      {service.faq.length > 0 && (
        <Section title="Частые вопросы" deferredClass="[--section-height:900px]">
          {faqJsonLd && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
          )}
          <div className="ds-prose-width">
            <Faq items={service.faq} />
          </div>
        </Section>
      )}

      <Section title="Отзывы клиентов" deferredClass="[--section-height:650px]">
        <ReviewsRail reviews={reviews} allReviewsUrl={allReviewsUrl} />
      </Section>

      <Section deferredClass="[--section-height:2250px]">
        <SeoProse html={service.seoText} />
      </Section>

      {related.length > 0 && (
        <Section title="Также вам может быть интересно" deferredClass="[--section-height:1500px]">
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <ServiceCard
                key={r.slug}
                href={r.href}
                title={r.title}
                tagline={r.tagline}
                cta="Подробнее"
                image={r.image}
              />
            ))}
          </div>
        </Section>
      )}

      {crossSell && (
        <Section>
          <CrossSell
            title={crossSell.title}
            text={crossSell.text}
            href={crossSell.href}
            image={crossSell.image}
          />
        </Section>
      )}
    </>
  );
}
