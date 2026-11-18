import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AlarmLandingTemplate from "@/components/redesign/AlarmLandingTemplate";
import { ALARM_HUB_SLUG, getAlarmLanding, getAlarmLandings } from "@/lib/db/queries/alarm";
import { getCarClassesForPricing, getService } from "@/lib/db/queries/services";
import { getPortfolioItems } from "@/lib/db/queries/content";
import { getSettings } from "@/lib/db/queries/settings";
import { getServicePageData } from "@/lib/redesign/service-page";
import { getHeroMedia } from "@/lib/redesign/hero-loops";

/**
 * Посадочные сигнализаций. Контент — таблица alarm_landings (админка →
 * «Сигнализации»), прайс и этапы — услуга-хаб. Здесь только сборка данных.
 */

export const dynamic = "force-dynamic";

const SITE = "https://dpkzn.ru";
/** Кейсы, относящиеся к охранным системам */
const ALARM_CASE_RX = /сигнализ|автозапуск|starline|pandora|охран/i;

type Params = { params: Promise<{ variant: string }> };

function load(variant: string) {
  const hub = getService(ALARM_HUB_SLUG);
  const landing = getAlarmLanding(variant);
  if (!hub || !hub.isActive || !landing) notFound();
  return { hub, landing };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { variant } = await params;
  const hub = getService(ALARM_HUB_SLUG);
  const landing = getAlarmLanding(variant);
  if (!hub?.isActive || !landing) return {};
  const url = `${SITE}${landing.url}`;
  return {
    title: { absolute: landing.metaTitle },
    description: landing.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: landing.metaTitle,
      description: landing.metaDescription,
      url,
      type: "website",
      locale: "ru_RU",
      siteName: "Detailing Place",
    },
  };
}

export default async function AlarmLandingPage({ params }: Params) {
  const { variant } = await params;
  const { hub, landing } = load(variant);
  const settings = getSettings();
  const data = getServicePageData(ALARM_HUB_SLUG);

  const lowPrice = (hub.packages[0]?.classPrices[0] || "").replace(/\D/g, "");
  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: landing.h1,
    description: landing.metaDescription,
    url: `${SITE}${landing.url}`,
    provider: { "@id": `${SITE}/#organization` },
    areaServed: { "@type": "City", name: "Казань" },
    ...(lowPrice
      ? { offers: { "@type": "AggregateOffer", priceCurrency: "RUB", lowPrice, offerCount: hub.packages.length } }
      : {}),
  };
  const faqLd =
    landing.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: landing.faq.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  const cases = getPortfolioItems().filter((c) => ALARM_CASE_RX.test([c.serviceName ?? "", ...c.tags].join(" ")));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <AlarmLandingTemplate
        landing={landing}
        hub={hub}
        others={getAlarmLandings().filter((l) => l.slug !== landing.slug)}
        cases={cases}
        crossSell={data?.crossSell}
        carClasses={getCarClassesForPricing()}
        poster={getHeroMedia(ALARM_HUB_SLUG).poster}
        contacts={{
          phone: settings.phone || "+7 (919) 644-93-93",
          phoneRaw: settings.phone_raw || "79196449393",
          whatsappUrl: settings.whatsapp_url || "https://wa.me/79196449393",
          telegramUrl: settings.telegram_url || "https://t.me/+79196449393",
          maxUrl: settings.max_url || undefined,
        }}
      />
    </>
  );
}
