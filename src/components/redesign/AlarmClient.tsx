"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { MessageCircle, Phone, Send } from "@/components/ds/icons";
import { goals, reachGoal } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Клиентские островки посадочных сигнализаций.
 *
 * QuickChannels — WhatsApp, Telegram и звонок одной строкой. На первом экране
 * их видно сразу; ниже экрана тот же набор держит нижняя панель StickyCTA.
 * Клик — цель Метрики с параметром источника (alarm:<variant>).
 *
 * FormViewGoal — цель «форма попала в экран» один раз за просмотр страницы.
 */

interface QuickChannelsProps {
  source: string;
  whatsappUrl: string;
  telegramUrl: string;
  phone: string;
  phoneRaw: string;
  className?: string;
}

const CHANNEL =
  "ds-focus inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-pill border border-line bg-surface px-2 text-body-sm font-semibold text-ink transition-colors duration-150 hover:bg-elevated sm:flex-none sm:px-5";

export function QuickChannels({ source, whatsappUrl, telegramUrl, phone, phoneRaw, className }: QuickChannelsProps) {
  const params = { form: source };
  return (
    // На телефоне три подписи в одну строку не влезают (обрезались до «Wha…»):
    // мессенджеры — парой, звонок с номером — во всю ширину под ними
    <div className={cn("grid grid-cols-2 gap-2 sm:flex sm:gap-3", className)}>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={CHANNEL}
        onClick={() => reachGoal(goals.WHATSAPP_CLICK, params)}
      >
        <MessageCircle size={18} className="flex-shrink-0 text-whatsapp" />
        <span className="truncate">WhatsApp</span>
      </a>
      <a
        href={telegramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={CHANNEL}
        onClick={() => reachGoal(goals.TELEGRAM_CLICK, params)}
      >
        <Send size={18} className="flex-shrink-0 text-telegram" />
        <span className="truncate">Telegram</span>
      </a>
      <a
        href={`tel:+${phoneRaw.replace(/\D/g, "")}`}
        className={cn(CHANNEL, "col-span-2")}
        aria-label={`Позвонить ${phone}`}
        onClick={() => reachGoal(goals.PHONE_CLICK, params)}
      >
        <Phone size={18} className="flex-shrink-0" />
        <span className="truncate">{phone}</span>
      </a>
    </div>
  );
}

export function FormViewGoal({ source, children }: { source: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        reachGoal(goals.FORM_VIEW, { form: source });
        io.disconnect();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [source]);
  return <div ref={ref}>{children}</div>;
}
