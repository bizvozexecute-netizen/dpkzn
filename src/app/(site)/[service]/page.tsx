import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getService, getAllServices } from "@/lib/db/queries/services";
import { getSeasonalOffer, getSettings } from "@/lib/db/queries/settings";
import { getServicePageData } from "@/lib/redesign/service-page";
import ServiceTemplate from "@/components/redesign/ServiceTemplate";
import { formatPageTitle } from "@/lib/utils";
import Link from "next/link";
import CrossSell from "@/components/ds/CrossSell";
import AlarmHubLinks from "@/components/redesign/AlarmHubLinks";
import { QuickChannels } from "@/components/redesign/AlarmClient";
import Button from "@/components/ds/Button";
import { ALARM_HUB_SLUG, ALARM_HUB_URL, getAlarmLandings } from "@/lib/db/queries/alarm";
import { getHeroMedia } from "@/lib/redesign/hero-loops";

/** Услуги, с которых в сезон ведём на установку сигнализации */
const ALARM_CROSS_FROM = new Set(["shumoizolyaciya", "tonirovka", "ustanovka-linz", "regulirovka-far"]);
export const dynamic = "force-dynamic";
/* ───────── Разметка Service ───────── */

function buildServiceJsonLd(service: ReturnType<typeof getService>) {
  if (!service) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.h1,
    description: service.seoDescription ?? service.subtitle,
    provider: {
      "@id": "https://dpkzn.ru/#organization",
    },
    areaServed: "Казань",
    offers:
      service.packages.length > 0
        ? {
            "@type": "AggregateOffer",
            priceCurrency: "RUB",
            lowPrice: (service.packages[0].classPrices[0] || "").replace(/\D/g, ""),
            offerCount: service.packages.length,
          }
        : undefined,
  };
}

/* ───────── Page ───────── */

interface PageProps {
  params: Promise<{ service: string }>;
}

/** Услуги, где в заголовке сниппета стоит цена «от» — см. generateMetadata */
const PRICE_IN_TITLE = new Set(["polirovka", "himchistka"]);

export async function generateStaticParams() {
  return getAllServices().map((s) => ({ service: s.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { service: slug } = await params;
  if (slug === "antikor") {
    return {
      title: "Антикор автомобиля в Казани | Detailing Place",
      description: "Антикор днища мы не выполняем. Поможем выбрать плёнку или покрытие для защиты кузова от реагентов.",
      alternates: { canonical: "https://dpkzn.ru/antikor" },
    };
  }
  const service = getService(slug);
  // Выключенная услуга (isActive=false в сиде) — 404, как и несуществующая
  if (!service || !service.isActive) return {};

  // Цена в заголовке сниппета — эксперимент на двух кластерах (26.09.2026).
  // По полировке и химчистке сотни показов в неделю на позициях 8–10 и ноль
  // кликов, а запросы почти все про цену («сколько стоит полировка кузова»,
  // «химчистка авто стоимость»). Линзы на тех же позициях кликают в 7% — там
  // конкретика уже в сниппете. Цена — минимальная из прайса, как на карточке
  // главной. Через 2–3 недели сравнить CTR в Вебмастере и решить про остальные.
  const minPrice = PRICE_IN_TITLE.has(slug) ? service.packages[0]?.classPrices[0] : null;
  const title = minPrice
    ? formatPageTitle(`${service.h1} от ${minPrice.replace(/^от\s*/i, "").replace(/₽$/, " ₽")}`)
    : formatPageTitle(service.h1);
  const description = service.seoDescription ?? service.subtitle;
  const url = `https://dpkzn.ru${service.url}`;

  return {
    title,
    description,
    keywords: service.keywords.length > 0 ? service.keywords : undefined,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: "ru_RU",
      siteName: "Detailing Place",
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function ServicePage({ params }: PageProps) {
  const { service: slug } = await params;
  if (slug === "antikor") {
    return (
      <section className="ds-section pt-32 md:pt-40">
        <div className="ds-container max-w-4xl">
          <h1 className="font-display text-h1 text-ink">Антикор автомобиля в Казани</h1>
          <p className="mt-6 text-body-lg text-ink">Антикоррозийную обработку днища мы не выполняем. Для защиты кузова от реагентов предлагаем антигравийную плёнку и защитные покрытия.</p>
          <div className="mt-8 flex flex-wrap gap-4 text-accent">
            <Link className="ds-focus underline" href="/broneplenka">Защита кузова плёнкой</Link>
            <Link className="ds-focus underline" href="/zashchitnye-pokrytiya">Защитные покрытия</Link>
            <Link className="ds-focus underline" href="/contacts">Связаться со студией</Link>
          </div>
        </div>
      </section>
    );
  }
  const service = getService(slug);
  // isActive=false — страница скрыта (владелец 10.09: антикор), отдаём 404;
  // из sitemap, меню и анатомии её убирают запросы с фильтром isActive
  if (!service || !service.isActive) notFound();

  const data = getServicePageData(slug);
  if (!data) notFound();

  const settings = getSettings();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildServiceJsonLd(service)) }}
      />
      <ServiceTemplate
        data={data}
        season={getSeasonalOffer()}
        whatsappUrl={settings.whatsapp_url || "https://wa.me/79196449393"}
        telegramUrl={settings.telegram_url || "https://t.me/+79196449393"}
        // Хаб сигнализаций: одна форма на странице — квиз #quiz; первый экран
        // ведёт к нему и даёт быстрые каналы вместо второй формы
        heroLeadSlot={slug === ALARM_HUB_SLUG ? (
          <div className="mt-6 max-w-[560px] space-y-3">
            <Button href="#quiz" className="w-full sm:w-auto">Рассчитать стоимость</Button>
            <QuickChannels
              source="alarm:hub"
              whatsappUrl={settings.whatsapp_url || "https://wa.me/79196449393"}
              telegramUrl={settings.telegram_url || "https://t.me/+79196449393"}
              phone={settings.phone || "+7 (919) 644-93-93"}
              phoneRaw={settings.phone_raw || "79196449393"}
            />
          </div>
        ) : undefined}
      />
      {slug === ALARM_HUB_SLUG && <AlarmHubLinks landings={getAlarmLandings()} />}
      {ALARM_CROSS_FROM.has(slug) && service.crossSell?.href !== ALARM_HUB_URL && (() => {
        const hub = getService(ALARM_HUB_SLUG);
        return hub?.isActive ? (
          <section className="ds-section-sm pb-safe" data-gate-new="сезон сигнализаций: кросс-продажа на хаб">
            <div className="ds-container">
              <CrossSell title={hub.h1} text={hub.subtitle} href={hub.url} image={getHeroMedia(ALARM_HUB_SLUG).poster} />
            </div>
          </section>
        ) : null;
      })()}
    </>
  );
}
