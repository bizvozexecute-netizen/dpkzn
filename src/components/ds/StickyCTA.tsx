"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Plus, Send } from "./icons";
import PhotoEstimateSheet from "./PhotoEstimateSheet";
import type { CarClass } from "@/lib/types";
import { reachGoal, goals } from "@/lib/analytics";
import { ANATOMY_SHEET_EVENT, LEAD_FOCUS_EVENT, QUIZ_CONTACT_EVENT } from "@/lib/redesign/events";
import { cn } from "@/lib/utils";

/**
 * Единственный плавающий элемент сайта (ДС §4.10). Один инстанс на страницу.
 *
 * Прячется в трёх случаях: открыт шаг контакта в квизе (иначе два одинаковых CTA
 * в одном экране), поднята клавиатура на мобильном (панель перекрывает поле ввода)
 * и когда в кадре футер — там уже есть телефон и мессенджеры.
 *
 * Квиз сообщает о шаге контакта событием ds:quiz-contact — так связь остаётся
 * односторонней и не тянет за собой общий контекст ради одного булева флага.
 *
 * Кнопка «Расчёт по фото» открывает одноимённый шит (PhotoEstimateSheet), а
 * не скроллит к квизу: квиз фото не просит, и обещание кнопки в нём не
 * выполнялось (владелец 04.09).
 */

interface StickyCTAProps {
  whatsappUrl: string;
  telegramUrl: string;
  maxUrl: string;
  /** Классы авто для подбора модели в шите «Расчёт по фото» */
  carClasses?: CarClass[];
  /** Селектор футера, при появлении которого панель прячется */
  footerSelector?: string;
}

export default function StickyCTA({
  whatsappUrl,
  telegramUrl,
  maxUrl,
  carClasses = [],
  footerSelector = "footer",
}: StickyCTAProps) {
  const [visible, setVisible] = useState(false);
  const [nearFooter, setNearFooter] = useState(false);
  const [nearAnatomy, setNearAnatomy] = useState(false);
  const [onContactStep, setOnContactStep] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  /** В одной из форм захвата фокус — второй призыв рядом не нужен */
  const [leadFocus, setLeadFocus] = useState(false);
  const [photoVisited, setPhotoVisited] = useState(false);
  const openPhoto = useCallback(() => { setPhotoVisited(true); setPhotoOpen(true); }, []);
  const closePhoto = useCallback(() => setPhotoOpen(false), []);

  useEffect(() => {
    const open = openPhoto;
    window.addEventListener("ds:photo-estimate", open);
    return () => window.removeEventListener("ds:photo-estimate", open);
  }, [openPhoto]);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        // Десктоп — после 1.5 вьюпорта, мобайл — после первого экрана (ДС §4.10)
        const threshold = window.innerWidth >= 1024 ? window.innerHeight * 1.5 : window.innerHeight * 0.9;
        setVisible(window.scrollY > threshold);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const footer = document.querySelector(footerSelector);
    if (!footer) return;
    const io = new IntersectionObserver(([entry]) => setNearFooter(entry.isIntersecting), {
      rootMargin: "0px 0px 100px 0px",
    });
    io.observe(footer);
    return () => io.disconnect();
  }, [footerSelector]);

  // Широкий десктоп: смета «Анатомии» живёт в правой колонке, ровно там, где
  // висит капсула, — пока блок на экране, капсула уступает (в блоке своя
  // кнопка расчёта). До 1280 колонки нет, и прятать нечего.
  useEffect(() => {
    if (!window.matchMedia("(min-width: 1280px)").matches) return;
    const anatomy = document.querySelector("#anatomy");
    if (!anatomy) return;
    const io = new IntersectionObserver(([entry]) => setNearAnatomy(entry.isIntersecting), {
      rootMargin: "-80px 0px 0px 0px",
    });
    io.observe(anatomy);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onQuizStep = (e: Event) => setOnContactStep(Boolean((e as CustomEvent<{ active: boolean }>).detail?.active));
    window.addEventListener(QUIZ_CONTACT_EVENT, onQuizStep);
    return () => window.removeEventListener(QUIZ_CONTACT_EVENT, onQuizStep);
  }, []);

  // Фокус в форме захвата. На телефоне капсулу и так прячет поднятая клавиатура,
  // а на десктопе она висит в том же правом нижнем углу, где полосы с формой
  useEffect(() => {
    const onFocus = (e: Event) => setLeadFocus(Boolean((e as CustomEvent<{ active: boolean }>).detail?.active));
    window.addEventListener(LEAD_FOCUS_EVENT, onFocus);
    return () => window.removeEventListener(LEAD_FOCUS_EVENT, onFocus);
  }, []);

  // Открыт шит зоны «Анатомии» — мобильная панель уступает ему низ экрана
  useEffect(() => {
    const onSheet = (e: Event) => setSheetOpen(Boolean((e as CustomEvent<{ open: boolean }>).detail?.open));
    window.addEventListener(ANATOMY_SHEET_EVENT, onSheet);
    return () => window.removeEventListener(ANATOMY_SHEET_EVENT, onSheet);
  }, []);

  // Поднятая клавиатура ужимает visualViewport, окно при этом не меняется.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setKeyboardOpen(vv.height < window.innerHeight * 0.75);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  // Пока открыт шит «Расчёт по фото», панель уходит: под модальным окном
  // ей делать нечего, а на телефоне она бы легла поверх формы
  const shown =
    visible && !nearFooter && !nearAnatomy && !onContactStep && !keyboardOpen && !photoOpen && !leadFocus;
  const shownMobile = shown && !sheetOpen;



  return (
    <>
    {photoVisited && <PhotoEstimateSheet
      open={photoOpen}
      onClose={closePhoto}
      whatsappUrl={whatsappUrl}
      telegramUrl={telegramUrl}
      maxUrl={maxUrl}
      carClasses={carClasses}
    />}
    <div
      className={cn(
        "fixed z-70 transition-[opacity,transform] duration-250 ease-out",
        "inset-x-0 bottom-0 lg:inset-x-auto lg:bottom-6 lg:right-6",
        shown ? "translate-y-0 opacity-100" : "hidden",
      )}
      inert={!shown}
    >
      {/* Мобайл: нижняя панель 64px; уступает низ экрана шиту «Анатомии» */}
      <div
        inert={!shownMobile}
        className={cn(
          "flex h-16 items-center gap-2 border-t border-line bg-[rgba(10,10,12,0.8)] px-4 shadow-sticky backdrop-blur-[16px] transition-[opacity,transform] duration-250 lg:hidden",
          !shownMobile && "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <button
          type="button"
          onClick={openPhoto}
          className="ds-btn-primary ds-focus h-12 flex-1 rounded-pill bg-ink px-5 text-body-sm font-semibold text-bg transition-colors duration-250 active:bg-accent-pressed"
        >
          Расчёт по фото
        </button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="ds-focus flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-pill border border-line bg-surface"
          onClick={() => reachGoal(goals.WHATSAPP_CLICK)}
        >
          <MessageCircle size={20} className="text-whatsapp" />
        </a>
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Telegram"
          className="ds-focus flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-pill border border-line bg-surface"
          onClick={() => reachGoal(goals.TELEGRAM_CLICK)}
        >
          <Send size={20} className="text-telegram" />
        </a>
      </div>

      {/* Десктоп: капсула справа внизу */}
      <div className="hidden items-center gap-3 rounded-pill border border-line bg-elevated p-2 pl-6 shadow-card lg:flex">
        <button
          type="button"
          onClick={openPhoto}
          className="ds-btn-primary ds-focus h-12 rounded-pill bg-ink px-6 text-body-sm font-semibold text-bg transition-colors duration-250 hover:bg-accent-hover hover:shadow-glow-accent active:bg-accent-pressed"
        >
          Расчёт по фото
        </button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="ds-focus flex h-12 w-12 items-center justify-center rounded-pill border border-line bg-surface transition-colors duration-150 hover:border-line-strong"
          onClick={() => reachGoal(goals.WHATSAPP_CLICK)}
        >
          <MessageCircle size={20} className="text-whatsapp" />
        </a>
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Telegram"
          className="ds-focus flex h-12 w-12 items-center justify-center rounded-pill border border-line bg-surface transition-colors duration-150 hover:border-line-strong"
          onClick={() => reachGoal(goals.TELEGRAM_CLICK)}
        >
          <Send size={20} className="text-telegram" />
        </a>
        {expanded ? (
          <a
            href={maxUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Max"
              className="ds-focus flex h-12 w-12 items-center justify-center rounded-pill border border-line bg-surface transition-colors duration-150 hover:border-line-strong"
            onClick={() => reachGoal(goals.MAX_CLICK)}
          >
            <MessageCircle size={20} className="text-max" />
          </a>
        ) : (
          <button
            type="button"
            aria-label="Другие мессенджеры"
              onClick={() => setExpanded(true)}
            className="ds-focus flex h-12 w-12 items-center justify-center rounded-pill border border-line bg-surface text-ink-secondary transition-colors duration-150 hover:border-line-strong hover:text-ink"
          >
            <Plus size={20} />
          </button>
        )}
      </div>
    </div>
    </>
  );
}
