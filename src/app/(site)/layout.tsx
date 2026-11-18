import DsHeader, { type HeaderGroup } from "@/components/ds/Header";
import DsFooter from "@/components/ds/Footer";
import StickyCTA from "@/components/ds/StickyCTA";
import { getAlarmSeason } from "@/components/redesign/AlarmSeasonBar";
import { MEGAMENU_GROUPS } from "@/lib/redesign/nav-groups";
import ScrollTracker from "@/components/funnel/ScrollTracker";
import CursorWheel from "@/components/fx/CursorWheel";
import ClientAnalytics from "@/components/analytics/ClientAnalytics";
import { getSettings, getNavItems } from "@/lib/db/queries/settings";
import { getCarClassesForPricing, getServiceMenuItems } from "@/lib/db/queries/services";
import { METRIKA_SCRIPT, VK_PIXEL_SCRIPT } from "@/lib/analytics";
import { HOURS_CLOSE, HOURS_OPEN, VK_PIXEL_ID } from "@/lib/constants";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = getSettings();
  const nav = getNavItems();

  // Мегаменю Dark Studio: все 19 услуг по группам инвентаризации.
  const menuItems = getServiceMenuItems();
  const menuBySlug = new Map(menuItems.map((i) => [i.slug, i]));
  const megaGroups: HeaderGroup[] = MEGAMENU_GROUPS.map((g) => ({
    title: g.title,
    items: g.slugs.map((slug) => menuBySlug.get(slug)).filter((i) => i !== undefined),
  }));

  const phone = settings.phone || "+7 (919) 644-93-93";
  const phoneRaw = settings.phone_raw || "79196449393";
  const whatsappUrl = settings.whatsapp_url || "https://wa.me/79196449393";
  const telegramUrl = settings.telegram_url || "https://t.me/+79196449393";
  const maxUrl = settings.max_url || "https://max.ru/u/f9LHodD0cOJb1nvCzhGOn7VrR1YECugldH9tgKkPSFiRv5Jon9WWQ07xkF4";
  const address = settings.address || "";
  const hours = settings.hours || "";
  const metrikaId = settings.metrika_id || "00000000";
  // Координаты — из карточки организации на Яндекс.Картах (org 49387442667)
  const coordLat = settings.coordinates_lat || "55.826848";
  const coordLng = settings.coordinates_lng || "49.093109";

  // Карточки организации на внешних площадках.
  const mapLinks = [
    { label: "Яндекс Карты", href: settings.yandex_maps_url || "https://yandex.ru/maps/org/detailing_place/49387442667/" },
    { label: "2ГИС", href: settings.gis2_url || "" },
    { label: "Zoon", href: settings.zoon_url || "" },
  ].filter((l) => l.href);

  // Соцсети — отдельным списком: сообщество не карточка на площадке,
  // и в футере это другая смысловая группа. В sameAs объединяем ниже.
  const socialLinks = [{ label: "ВКонтакте", href: settings.vk_url || "" }].filter((l) => l.href);

  const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;

  /**
   * LocalBusiness — по заготовке docs/redesign/content/schema/localbusiness.json.
   * Телефон и адрес — те же строки, что в шапке и на /contacts (правило NAP);
   * часы — из констант HOURS_OPEN/CLOSE в обоих принятых форматах schema.org.
   * aggregateRating не добавляем: требование Google к самообслуживаемым
   * рейтингам (README схем) — рейтинг есть не на каждой странице сайта.
   */
  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    "@id": "https://dpkzn.ru/#organization",
    name: "Detailing Place",
    description:
      "Студия премиального детейлинга в Казани: антигравийная плёнка PPF, полировка и керамика, тонировка, химчистка салона и ещё 15 услуг.",
    url: "https://dpkzn.ru/",
    telephone: phone,
    logo: "https://dpkzn.ru/images/logo-400.png",
    image: "https://dpkzn.ru/images/og-default.webp",
    sameAs: [...mapLinks, ...socialLinks].map((l) => l.href),
    address: {
      "@type": "PostalAddress",
      streetAddress: address,
      addressLocality: "Казань",
      addressRegion: "Республика Татарстан",
      addressCountry: "RU",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: parseFloat(coordLat),
      longitude: parseFloat(coordLng),
    },
    openingHours: `Mo-Su ${pad(HOURS_OPEN)}-${pad(HOURS_CLOSE)}`,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: pad(HOURS_OPEN),
        closes: pad(HOURS_CLOSE),
      },
    ],
    priceRange: "₽₽₽",
  };

  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://dpkzn.ru/#website",
    name: "Detailing Place",
    url: "https://dpkzn.ru",
    inLanguage: "ru-RU",
    publisher: { "@id": "https://dpkzn.ru/#organization" },
  };

  return (
    <>
      {/* JSON-LD и Метрика рендерятся в body (валидно для поисковиков).
          НЕ оборачивать в <head> — React 19 хоистит скрипты и дублирует их,
          что даёт ошибку Вебмастера «несколько общих оценок». */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webSiteJsonLd),
        }}
      />
      <script dangerouslySetInnerHTML={{ __html: METRIKA_SCRIPT }} />
      {VK_PIXEL_ID && <script dangerouslySetInnerHTML={{ __html: VK_PIXEL_SCRIPT }} />}
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${metrikaId}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>

      <DsHeader
        groups={megaGroups}
        infoNav={nav.info}
        phone={phone}
        phoneRaw={phoneRaw}
        whatsappUrl={whatsappUrl}
        telegramUrl={telegramUrl}
        maxUrl={maxUrl}
        season={getAlarmSeason()}
      />
      {/* Без верхнего отступа: hero уходит под прозрачную шапку (ДС §4.6) */}
      <main className="site-content">{children}</main>
      <DsFooter
        services={menuItems}
        infoNav={nav.info}
        phone={phone}
        phoneRaw={phoneRaw}
        address={address}
        hours={hours}
        whatsappUrl={whatsappUrl}
        telegramUrl={telegramUrl}
        maxUrl={maxUrl}
      />
      <StickyCTA
        whatsappUrl={whatsappUrl}
        telegramUrl={telegramUrl}
        maxUrl={maxUrl}
        phoneRaw={phoneRaw}
        carClasses={getCarClassesForPricing()}
      />

      <CursorWheel />
      <ScrollTracker />
      <ClientAnalytics />
    </>
  );
}
