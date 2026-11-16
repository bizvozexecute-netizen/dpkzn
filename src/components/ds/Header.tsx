"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, MessageCircle, Phone, Send, X } from "./icons";
import type { ServiceMenuItem } from "@/lib/types";
import { reachGoal, goals } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import Button from "./Button";

/**
 * Шапка Dark Studio с мегаменю (ДС §4.6).
 *
 * Три состояния фона: прозрачная поверх hero → подложка с blur после 40px →
 * скрыта при скролле вниз глубже 400px. Скрытие отключено, пока открыто меню:
 * уехавшая из-под курсора панель — самый быстрый способ потерять пользователя.
 */

export interface HeaderGroup {
  title: string;
  items: ServiceMenuItem[];
}

interface HeaderProps {
  groups: HeaderGroup[];
  infoNav: { label: string; href: string }[];
  phone: string;
  phoneRaw: string;
  whatsappUrl: string;
  telegramUrl: string;
  maxUrl: string;
  /** Куда ведёт кнопка «Расчёт»: якорь квиза страницы */
  quizHref?: string;
}

const INTENT_DELAY = 100;

export default function Header({
  groups,
  infoNav,
  phone,
  phoneRaw,
  whatsappUrl,
  telegramUrl,
  maxUrl,
  quizHref = "#quiz",
}: HeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const lastY = useRef(0);
  const intent = useRef<number | undefined>(undefined);
  const anyMenuOpen = megaOpen || mobileOpen;

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        setScrolled(y > 40);
        setHidden(y > 400 && y > lastY.current);
        lastY.current = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Блокируем прокрутку под полноэкранной панелью, иначе фон уезжает под пальцем.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMegaOpen(false);
      setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openMega = useCallback(() => {
    window.clearTimeout(intent.current);
    intent.current = window.setTimeout(() => {
      setMegaOpen(true);
      reachGoal(goals.MENU_OPEN);
    }, INTENT_DELAY);
  }, []);

  const closeMega = useCallback(() => {
    window.clearTimeout(intent.current);
    setMegaOpen(false);
  }, []);

  // Переход закрывает меню: панель, пережившая навигацию, выглядит как баг.
  // Вешаем на ссылки, а не на эффект от pathname — setState в теле эффекта
  // даёт лишний каскад рендеров на каждой навигации.
  const closeMenus = () => {
    setMegaOpen(false);
    setMobileOpen(false);
  };

  const isActive = (href: string) => pathname === href;

  return (
    <>
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[transform,background-color,border-color,backdrop-filter] duration-250 ease-out",
        scrolled || anyMenuOpen
          ? "border-b border-line bg-[rgba(10,10,12,0.8)] backdrop-blur-[16px]"
          : "border-b border-transparent bg-transparent",
        hidden && !anyMenuOpen && "-translate-y-full",
      )}
      onMouseLeave={closeMega}
    >
      <div className="ds-container flex h-15 items-center justify-between md:h-18">
        <Link
          href="/"
          className="ds-focus flex h-11 flex-shrink-0 items-center rounded-sm"
          aria-label="Detailing Place — на главную"
          onClick={closeMenus}
        >
          <Image
            src="/images/logo-header-v1.webp"
            alt="Detailing Place"
            className="h-9 w-auto md:h-10"
            width={176}
            height={109}
            unoptimized
            loading="eager"
          />
        </Link>

        {/* ── Десктоп ── */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Основная навигация">
          <div onMouseEnter={openMega}>
            <button
              type="button"
              className={cn(
                "ds-focus flex h-11 items-center gap-1.5 rounded-pill px-4 text-body-sm font-semibold transition-colors duration-150",
                megaOpen ? "text-accent" : "text-ink hover:text-accent",
              )}
              aria-expanded={megaOpen}
              aria-haspopup="true"
              onClick={() => setMegaOpen((v) => !v)}
            >
              Услуги
              <ChevronDown size={16} className={cn("transition-transform duration-250", megaOpen && "rotate-180")} />
            </button>
          </div>

          {infoNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenus}
              className={cn(
                "ds-focus flex h-11 items-center rounded-pill px-4 text-body-sm font-semibold transition-colors duration-150",
                isActive(item.href) ? "text-accent" : "text-ink hover:text-accent",
              )}
            >
              {/* Подчёркивание растёт у текста, не у пилюли — обёртка span */}
              <span className="ds-link-anim">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <a
            href={`tel:+${phoneRaw}`}
            className="ds-focus rounded-sm text-body-sm font-semibold text-ink transition-colors duration-150 hover:text-accent"
            onClick={() => reachGoal(goals.PHONE_CLICK)}
          >
            {phone}
          </a>
          {/* Контурная: primary в шапке спорил бы с CTA hero на одном экране */}
          <Button href={quizHref} variant="secondary" size="sm" className="px-6">
            Расчёт
          </Button>
        </div>

        {/* ── Мобайл ── */}
        <div className="flex items-center gap-2 lg:hidden">
          <a
            href={`tel:+${phoneRaw}`}
            className="ds-focus flex h-11 w-11 items-center justify-center rounded-pill border border-line text-ink"
            aria-label="Позвонить"
            onClick={() => reachGoal(goals.PHONE_CLICK)}
          >
            <Phone size={18} />
          </a>
          <button
            type="button"
            className="ds-focus flex h-11 w-11 items-center justify-center rounded-pill border border-line text-ink"
            aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={mobileOpen}
            onClick={() => {
              setMobileOpen((v) => !v);
              if (!mobileOpen) reachGoal(goals.MENU_OPEN);
            }}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ── Мегаменю: все 19 услуг ── */}
      {megaOpen && <div
        className={cn(
          "absolute inset-x-0 top-full hidden border-b border-line bg-elevated transition-[opacity,transform] duration-250 ease-out lg:block",
          megaOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
        inert={!megaOpen}
      >
        <div className="ds-container grid grid-cols-5 gap-8 py-10">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-4 text-overline uppercase text-ink-secondary">{group.title}</p>
              <ul className="space-y-3">
                {group.items.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={item.href}
                      className="ds-focus group block rounded-sm"
                      onClick={() => {
                        closeMenus();
                        reachGoal(goals.SERVICE_CLICK, { service: item.slug });
                      }}
                    >
                      <span
                        className={cn(
                          "block text-body-sm font-medium transition-colors duration-150",
                          isActive(item.href) ? "text-accent" : "text-ink group-hover:text-accent",
                        )}
                      >
                        {item.label}
                      </span>
                      {item.priceFrom && (
                        <span className="ds-nums block text-caption text-ink-secondary">{item.priceFrom}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>}

    </header>

      {/* ── Мобильная панель ── */}
      <div
        className={cn(
          // Вне <header>: у шапки при открытом меню включается backdrop-filter, а он
          // делает шапку контейнером для position: fixed — панель получала
          // top/bottom относительно 60px шапки и схлопывалась в ноль
          "fixed inset-x-0 top-15 bottom-0 z-40 overflow-y-auto bg-bg transition-[opacity,transform] duration-250 ease-out lg:hidden",
          mobileOpen ? "translate-x-0 opacity-100" : "hidden",
        )}
        inert={!mobileOpen}
      >
        <div className="ds-container flex min-h-full flex-col py-6">
          <nav aria-label="Услуги">
            {groups.map((group) => {
              const open = openGroup === group.title;
              return (
                <div key={group.title} className="border-b border-line">
                  <button
                    type="button"
                    className="ds-focus flex min-h-[56px] w-full items-center justify-between text-left text-body font-semibold text-ink"
                    aria-expanded={open}
                    onClick={() => setOpenGroup(open ? null : group.title)}
                  >
                    {group.title}
                    <ChevronDown size={18} className={cn("transition-transform duration-250", open && "rotate-180")} />
                  </button>
                  {open && (
                    <ul className="pb-3">
                      {group.items.map((item) => (
                        <li key={item.slug}>
                          <Link
                            href={item.href}
                            className="ds-focus flex min-h-[44px] items-center justify-between gap-4 rounded-sm py-2"
                            onClick={() => {
                        closeMenus();
                        reachGoal(goals.SERVICE_CLICK, { service: item.slug });
                      }}
                          >
                            <span className={cn("text-body-sm", isActive(item.href) ? "text-accent" : "text-ink")}>
                              {item.label}
                            </span>
                            {item.priceFrom && (
                              <span className="ds-nums flex-shrink-0 text-caption text-ink-secondary">
                                {item.priceFrom}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}

            <ul className="mt-2">
              {infoNav.map((item) => (
                <li key={item.href} className="border-b border-line">
                  <Link
                    href={item.href}
                    onClick={closeMenus}
                    className={cn(
                      "ds-focus flex min-h-[56px] items-center text-body font-semibold",
                      isActive(item.href) ? "text-accent" : "text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-auto pt-8">
            <a
              href={`tel:+${phoneRaw}`}
              className="ds-focus ds-nums inline-flex min-h-11 items-center rounded-sm text-price font-semibold text-ink"
              onClick={() => reachGoal(goals.PHONE_CLICK)}
            >
              {phone}
            </a>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button
                href={whatsappUrl}
                variant="messenger"
                size="sm"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => reachGoal(goals.WHATSAPP_CLICK)}
              >
                <MessageCircle size={18} className="text-whatsapp" />
                WhatsApp
              </Button>
              <Button
                href={telegramUrl}
                variant="messenger"
                size="sm"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => reachGoal(goals.TELEGRAM_CLICK)}
              >
                <Send size={18} className="text-telegram" />
                Telegram
              </Button>
              <Button
                href={maxUrl}
                variant="messenger"
                size="sm"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => reachGoal(goals.MAX_CLICK)}
              >
                <MessageCircle size={18} className="text-max" />
                Max
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
