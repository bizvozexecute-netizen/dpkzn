"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, MessageCircle, Send } from "./icons";
import type { ServiceMenuItem } from "@/lib/types";
import { reachGoal, goals } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Футер Dark Studio (ДС §4.7). Форм здесь нет — на странице ровно один квиз.
 *
 * «Оплатим такси до студии при заказе от 15 000 ₽» — спокойная строка, а не плашка:
 * это факт сервиса, а не акция, и в акционной подаче он читается как уловка.
 */

interface FooterProps {
  services: ServiceMenuItem[];
  infoNav: { label: string; href: string }[];
  phone: string;
  phoneRaw: string;
  address: string;
  hours: string;
  whatsappUrl: string;
  telegramUrl: string;
  maxUrl: string;
}

function MobileAccordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line md:hidden">
      <button
        type="button"
        className="ds-focus flex min-h-[56px] w-full items-center justify-between text-left text-body font-semibold text-ink"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        <ChevronDown size={18} className={cn("transition-transform duration-250", open && "rotate-180")} />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

export default function Footer({
  services,
  infoNav,
  phone,
  phoneRaw,
  address,
  hours,
  whatsappUrl,
  telegramUrl,
  maxUrl,
}: FooterProps) {
  const serviceLinks = (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
      {services.map((item) => (
        <li key={item.slug}>
          <Link
            href={item.href}
            className="ds-focus block min-h-[44px] rounded-sm py-2 text-body-sm text-ink-secondary transition-colors duration-150 hover:text-accent md:min-h-0 md:py-0"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  const companyLinks = (
    <ul className="space-y-2">
      {infoNav.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="ds-focus block min-h-[44px] rounded-sm py-2 text-body-sm text-ink-secondary transition-colors duration-150 hover:text-accent md:min-h-0 md:py-0"
          >
            {item.label}
          </Link>
        </li>
      ))}
      <li>
        <Link
          href="/privacy"
          className="ds-focus block min-h-[44px] rounded-sm py-2 text-body-sm text-ink-secondary transition-colors duration-150 hover:text-accent md:min-h-0 md:py-0"
        >
          Политика конфиденциальности
        </Link>
      </li>
    </ul>
  );

  return (
    <footer className="border-t border-line bg-bg">
      <div className="ds-container ds-section-sm">
        <div className="grid gap-10 md:grid-cols-4 md:gap-8">
          {/* Лого + мессенджеры */}
          <div>
            <Image src="/images/logo-header-v1.webp" alt="Detailing Place" width={176} height={109} unoptimized className="h-10 w-auto" />
            <p className="mt-4 max-w-[28ch] text-body-sm text-ink-secondary">
              Студия премиального детейлинга в Казани
            </p>
            <div className="mt-5 flex gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="ds-focus flex h-11 w-11 items-center justify-center rounded-pill border border-line bg-surface transition-colors duration-150 hover:border-line-strong"
                onClick={() => reachGoal(goals.WHATSAPP_CLICK)}
              >
                <MessageCircle size={18} className="text-whatsapp" />
              </a>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                className="ds-focus flex h-11 w-11 items-center justify-center rounded-pill border border-line bg-surface transition-colors duration-150 hover:border-line-strong"
                onClick={() => reachGoal(goals.TELEGRAM_CLICK)}
              >
                <Send size={18} className="text-telegram" />
              </a>
              <a
                href={maxUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Max"
                className="ds-focus flex h-11 w-11 items-center justify-center rounded-pill border border-line bg-surface transition-colors duration-150 hover:border-line-strong"
                onClick={() => reachGoal(goals.MAX_CLICK)}
              >
                <MessageCircle size={18} className="text-max" />
              </a>
            </div>
          </div>

          {/* Услуги — все 19 */}
          <div className="md:col-span-2">
            <p className="mb-4 hidden text-overline uppercase text-ink-secondary md:block">Услуги</p>
            <div className="hidden md:block">{serviceLinks}</div>
            <MobileAccordion title="Услуги">{serviceLinks}</MobileAccordion>
          </div>

          {/* Компания */}
          <div>
            <p className="mb-4 hidden text-overline uppercase text-ink-secondary md:block">Компания</p>
            <div className="hidden md:block">{companyLinks}</div>
            <MobileAccordion title="Компания">{companyLinks}</MobileAccordion>
          </div>
        </div>

        {/* Контакты — на мобайле всегда развёрнуты */}
        <div className="mt-10 border-t border-line pt-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="mb-2 text-overline uppercase text-ink-secondary">Телефон</p>
              <a
                href={`tel:+${phoneRaw}`}
                className="ds-focus ds-nums inline-flex min-h-11 items-center rounded-sm text-h4 font-semibold text-ink transition-colors duration-150 hover:text-accent"
                onClick={() => reachGoal(goals.PHONE_CLICK)}
              >
                {phone}
              </a>
            </div>
            <div>
              <p className="mb-2 text-overline uppercase text-ink-secondary">Адрес</p>
              <p className="text-body-sm text-ink">{address}</p>
              <p className="mt-1 text-body-sm text-ink-secondary">{hours}</p>
            </div>
            <div>
              <p className="mb-2 text-overline uppercase text-ink-secondary">Сервис</p>
              <p className="text-body-sm text-ink-secondary">
                Оплатим такси до студии при заказе от 15 000 ₽
              </p>
            </div>
          </div>
        </div>

        {/* Журнальная подпись: имя студии во всю ширину едва заметным контуром.
            aria-hidden — скринридеру это дубль названия; футер вне <main>,
            в контент-гейт не попадает. */}
        <p
          aria-hidden="true"
          className="mt-14 select-none overflow-hidden whitespace-nowrap font-display font-semibold leading-none tracking-tight text-[clamp(2.5rem,8vw,8.5rem)] text-[rgba(255,255,255,0.05)]"
        >
          Detailing Place
        </p>

        {/* Юрреквизиты не публикуем до решения студии (инвентаризация §5.3):
            пустого блока под них тоже не держим — он читался бы как недоделка. */}
        <div className="mt-6 border-t border-line pt-6 text-caption text-ink-secondary">
          <p>© {new Date().getFullYear()} Detailing Place</p>
        </div>
      </div>
    </footer>
  );
}
