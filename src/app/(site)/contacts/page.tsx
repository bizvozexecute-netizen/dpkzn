import type { Metadata } from "next";
import { HOURS } from "@/lib/constants";
import { getSettings } from "@/lib/db/queries/settings";
import Breadcrumbs from "@/components/ds/Breadcrumbs";
import MapEmbed from "@/components/ds/MapEmbed";
import LeadFormSection from "@/components/ds/LeadFormSection";
import TrackedLink from "@/components/ui/TrackedLink";
import { MessageCircle, Phone, Send } from "@/components/ds/icons";

export const metadata: Metadata = {
  title: "Контакты детейлинг-студии в Казани | Detailing Place",
  description: `Адрес студии Detailing Place в Казани. Телефон, WhatsApp, карта проезда. ${HOURS}.`,
  openGraph: {
    title: "Контакты детейлинг-студии в Казани | Detailing Place",
    description: `Адрес студии Detailing Place в Казани. Телефон, WhatsApp, карта проезда. ${HOURS}.`,
    url: "https://dpkzn.ru/contacts",
  },
  alternates: { canonical: "https://dpkzn.ru/contacts" },
};

/**
 * Контакты (ТЗ contacts): слева контакты крупно, справа ленивая карта.
 * Primary по-прежнему ведёт в WhatsApp. Ниже — форма обратного звонка для тех,
 * кому неудобно звонить самому (владелец 23.09.2026: «мы не везде забираем
 * телефон»). Юрреквизиты не публикуются (решение владельца 01.09.2026).
 */
export default function ContactsPage() {
  const cfg = getSettings();
  const phone = cfg.phone ?? "+7 (919) 644-93-93";
  const phoneRaw = cfg.phone_raw ?? "79196449393";
  const whatsappUrl = cfg.whatsapp_url ?? "https://wa.me/79196449393";
  const telegramUrl = cfg.telegram_url ?? "https://t.me/+79196449393";
  const maxUrl = cfg.max_url ?? "";
  const address = cfg.address ?? "";
  const hours = cfg.hours ?? "";
  const lat = cfg.coordinates_lat ?? "55.826848";
  const lng = cfg.coordinates_lng ?? "49.093109";

  return (
    <>
    <section className="pb-16 pt-28 md:pb-24 md:pt-40">
      <div className="ds-container">
        <Breadcrumbs items={[{ label: "Контакты" }]} className="mb-6" />
        <h1 className="font-display text-h1 text-ink">Контакты</h1>

        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Контакты крупно */}
          <div>
            <TrackedLink
              goal="PHONE_CLICK"
              href={`tel:+${phoneRaw}`}
              className="ds-focus ds-nums block whitespace-nowrap rounded-sm font-display text-h2 text-ink transition-colors duration-150 hover:text-accent"
            >
              {phone}
            </TrackedLink>
            <p className="mt-2 flex items-center gap-2 text-body-sm text-ink-secondary">
              <Phone size={16} className="text-phone" />
              Позвонить
            </p>

            {/* Формы нет: primary ведёт в WhatsApp (ТЗ contacts). Тексты —
                строки текущей страницы: «Записаться на визит» был заголовком
                формы, «Написать в мессенджер» — подписью кнопки. */}
            <p className="mt-9 text-overline uppercase text-ink-tertiary">Записаться на визит</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <TrackedLink
                goal="WHATSAPP_CLICK"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ds-focus inline-flex h-13 items-center gap-2.5 rounded-pill bg-ink px-7 text-body font-semibold text-bg transition-colors duration-250 hover:bg-accent-hover"
              >
                <MessageCircle size={20} />
                WhatsApp
              </TrackedLink>
              <TrackedLink
                goal="TELEGRAM_CLICK"
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ds-focus inline-flex h-13 items-center gap-2.5 rounded-pill border border-line bg-surface px-6 text-body font-semibold text-ink transition-colors duration-150 hover:border-line-strong"
              >
                <Send size={20} className="text-telegram" />
                Telegram
              </TrackedLink>
              {maxUrl && (
                <TrackedLink
                  goal="MAX_CLICK"
                  href={maxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ds-focus inline-flex h-13 items-center gap-2.5 rounded-pill border border-line bg-surface px-6 text-body font-semibold text-ink transition-colors duration-150 hover:border-line-strong"
                >
                  <MessageCircle size={20} className="text-max" />
                  Max
                </TrackedLink>
              )}
            </div>
            <p className="mt-3 text-caption text-ink-secondary">Написать в мессенджер</p>
            <p className="mt-3 text-body-sm text-ink">Работаем с организациями. Принимаем оплату любыми способами.</p>
            <p className="mt-2 text-body-sm text-ink-secondary">Напишите в любое время — ответим в рабочее время.</p>

            <dl className="mt-9 space-y-6 border-t border-line pt-7">
              <div>
                <dt className="text-overline uppercase text-ink-tertiary">Адрес</dt>
                <dd className="mt-1 text-body-lg text-ink">{address}</dd>
                <dd className="mt-0.5 text-caption text-ink-secondary">Казань</dd>
              </div>
              <div>
                <dt className="text-overline uppercase text-ink-tertiary">Часы работы</dt>
                <dd className="mt-1 text-body-lg text-ink">{hours}</dd>
                <dd className="mt-0.5 text-caption text-ink-secondary">Без выходных</dd>
              </div>
            </dl>

            <p
              className="mt-7 text-body-sm text-ink-secondary"
              data-gate-new="спокойная строка про такси (ТЗ contacts, без плашки)"
            >
              Оплатим такси до студии при заказе от 15 000 ₽.
            </p>
          </div>

          {/* Карта — не грузится до взаимодействия */}
          <MapEmbed lat={lat} lng={lng} address={address} />
        </div>
      </div>
    </section>

    <LeadFormSection
      source="page-bottom"
      gateNote="обратный звонок на контактах для тех, кому неудобно звонить самому (владелец 23.09.2026)"
      heading="Неудобно звонить?"
      lead="Оставьте номер — перезвоним сами в рабочее время."
      submitLabel="Перезвоните мне"
      submitLabelShort="Перезвоните"
      messengers={{ whatsappUrl, telegramUrl, maxUrl: maxUrl || undefined }}
      sectionClassName="pb-16 md:pb-24"
    />
    </>
  );
}
