import Link from "next/link";
import HeroService from "@/components/ds/HeroService";
import PriceTable from "@/components/ds/PriceTable";
import ProcessTimeline from "@/components/ds/ProcessTimeline";
import Faq from "@/components/ds/Faq";
import LeadForm from "@/components/ds/LeadForm";
import CrossSell from "@/components/ds/CrossSell";
import CaseCard from "@/components/ds/CaseCard";
import Button from "@/components/ds/Button";
import { Check } from "@/components/ds/icons";
import { FormViewGoal, QuickChannels } from "./AlarmClient";
import type { AlarmLanding } from "@/lib/db/queries/alarm";
import type { CarClass, PortfolioItem, ServiceData } from "@/lib/types";

/**
 * Посадочная сигнализаций (/ustanovka-signalizacii/[variant]).
 *
 * Тексты оффера, «что входит», FAQ и формы — из alarm_landings (админка),
 * прайс, этапы, УТП, кейсы и кросс-продажа — из услуги ustanovka-signalizacii.
 * В шаблоне только служебные подписи блоков.
 *
 * Форма на странице одна (ТЗ сезона): первый экран ведёт к ней якорем,
 * рядом — быстрые каналы.
 */

export const ALARM_FORM_ID = "alarm-form";

export interface AlarmLandingTemplateProps {
  landing: AlarmLanding;
  hub: ServiceData;
  others: AlarmLanding[];
  cases: PortfolioItem[];
  crossSell?: { title: string; text: string; href: string; image: string };
  carClasses: CarClass[];
  poster: string;
  contacts: { phone: string; phoneRaw: string; whatsappUrl: string; telegramUrl: string; maxUrl?: string };
}

function H2({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="scroll-mt-20 font-display text-h2 text-ink">
      {children}
    </h2>
  );
}

export default function AlarmLandingTemplate({
  landing,
  hub,
  others,
  cases,
  crossSell,
  carClasses,
  poster,
  contacts,
}: AlarmLandingTemplateProps) {
  const source = `alarm:${landing.slug}`;
  const messengers = { whatsappUrl: contacts.whatsappUrl, telegramUrl: contacts.telegramUrl, maxUrl: contacts.maxUrl };
  const hubLabel = hub.h1.replace(/ в Казани.*/, "");

  return (
    <>
      <HeroService
        overline={landing.overline}
        h1={landing.h1}
        lead={landing.lead}
        usp={landing.offerPoints}
        poster={poster}
        videoBase={null}
        worksHref={`#${ALARM_FORM_ID}`}
        carClasses={carClasses}
        messengers={messengers}
        crumbs={[{ label: hubLabel, href: hub.url }, { label: landing.navLabel }]}
        leadSlot={
          <div className="mt-6 max-w-[560px] space-y-3">
            <Button href={`#${ALARM_FORM_ID}`} className="w-full sm:w-auto">
              {landing.submitLabel || "Узнать цену"}
            </Button>
            <QuickChannels source={source} {...contacts} />
          </div>
        }
      />

      {hub.usp.length > 0 && (
        <section aria-label="Почему мы" className="border-b border-line">
          <ul className="ds-container flex flex-col gap-3 py-6 md:flex-row md:flex-wrap md:gap-8">
            {hub.usp.map((u) => (
              <li key={u} className="flex items-center gap-2 text-body-sm text-ink">
                <Check size={16} className="flex-shrink-0 text-accent" />
                {u}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hub.packages.length > 0 && (
        <section className="ds-section-sm" id="prices">
          <div className="ds-container">
            <H2>{landing.priceTitle || "Цены"}</H2>
            <PriceTable packages={hub.packages} carClasses={carClasses} elementPrices={hub.elementPrices} className="mt-8" />
          </div>
        </section>
      )}

      {(landing.included.length > 0 || hub.process.length > 0) && (
        <section className="ds-section-sm">
          <div className="ds-container grid gap-10 lg:grid-cols-2">
            {landing.included.length > 0 && (
              <div>
                <H2>{landing.includedTitle || "Что входит"}</H2>
                <ul className="mt-6 space-y-4">
                  {landing.included.map((item) => (
                    <li key={item} className="flex gap-3 text-body text-ink">
                      <Check size={20} className="mt-0.5 flex-shrink-0 text-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {hub.process.length > 0 && (
              <div>
                <H2>Этапы работы</H2>
                <div className="mt-6">
                  <ProcessTimeline steps={hub.process} />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {cases.length > 0 && (
        <section className="ds-section-sm">
          <div className="ds-container">
            <H2>Работы студии</H2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cases.slice(0, 3).map((c) => (
                <CaseCard key={c.slug} href={`/portfolio/${c.slug}`} car={c.car} serviceName={c.serviceName} tags={c.tags} image={c.image} />
              ))}
            </div>
          </div>
        </section>
      )}

      {landing.faq.length > 0 && (
        <section className="ds-section-sm">
          <div className="ds-container max-w-4xl">
            <H2>Частые вопросы</H2>
            <Faq items={landing.faq} className="mt-6" />
          </div>
        </section>
      )}

      <section className="ds-section-sm" aria-labelledby={`${ALARM_FORM_ID}-title`}>
        <div className="ds-container">
          <div
            id={ALARM_FORM_ID}
            className="grid scroll-mt-20 gap-6 rounded-xl border border-line bg-elevated p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,440px)] md:gap-10 md:p-8"
          >
            <div>
              <H2 id={`${ALARM_FORM_ID}-title`}>{landing.formTitle}</H2>
              {landing.formHint && <p className="mt-3 max-w-[48ch] text-body text-ink-secondary">{landing.formHint}</p>}
              <QuickChannels source={source} {...contacts} className="mt-6" />
            </div>
            <FormViewGoal source={source}>
              <LeadForm
                source={source}
                gateNote="Посадочная сигнализаций: единственная форма страницы (сезон 2026)"
                variant="expanded"
                carClasses={carClasses}
                service={landing.h1}
                submitLabel={landing.submitLabel || undefined}
                messengers={messengers}
              />
            </FormViewGoal>
          </div>
        </div>
      </section>

      {others.length > 0 && (
        <nav aria-label="Другие варианты" className="ds-section-sm">
          <div className="ds-container">
            <H2>Смотрите также</H2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <li>
                <Link href={hub.url} className="ds-focus block h-full rounded-lg border border-line bg-surface p-5 transition-colors hover:border-accent">
                  <span className="block font-semibold text-ink">{hubLabel}</span>
                  <span className="mt-1 block text-body-sm text-ink-secondary">{hub.subtitle}</span>
                </Link>
              </li>
              {others.map((o) => (
                <li key={o.slug}>
                  <Link href={o.url} className="ds-focus block h-full rounded-lg border border-line bg-surface p-5 transition-colors hover:border-accent">
                    <span className="block font-semibold text-ink">{o.navLabel}</span>
                    {o.teaser && <span className="mt-1 block text-body-sm text-ink-secondary">{o.teaser}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}

      {crossSell && (
        <section className="ds-section-sm">
          <div className="ds-container">
            <CrossSell {...crossSell} />
          </div>
        </section>
      )}
      <div aria-hidden="true" className="pb-safe" />
    </>
  );
}
