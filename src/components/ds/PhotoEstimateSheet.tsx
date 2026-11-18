"use client";

import { useEffect, useRef, useState } from "react";
import Button from "./Button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PhotoAttachments from "./PhotoAttachments";
import CarPicker, { type CarPick } from "./CarPicker";
import { MessageCircle, Send, X } from "./icons";
import type { CarClass } from "@/lib/types";
import { submitForm } from "@/lib/form-submit";
import { goals, reachGoal } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { PHOTO_SERVICES, photoServiceText, serviceForPath } from "@/lib/photo-estimate-services";

/**
 * «Расчёт по фото» по нажатию липкой кнопки (владелец 04.09: кнопка
 * обещала расчёт по фото, а бросала к квизу, где фото никто не просил).
 *
 * Два пути, оба короче квиза:
 * 1. Мессенджер — человек сам прикладывает фото там, где ему привычно; на
 *    телефоне это быстрее любой формы загрузки, и лид падает в те же
 *    WhatsApp/Telegram/Max, что уже работают.
 * 2. Номер — перезвоним и скажем, что снять. Автомобиль — по желанию.
 *
 * Телефон: шит снизу; десктоп: окно по центру. Закрывается крестиком,
 * Esc и тапом по фону. Пока открыт — страница под ним не скроллится.
 */
interface PhotoEstimateSheetProps {
  open: boolean;
  onClose: () => void;
  whatsappUrl: string;
  telegramUrl: string;
  maxUrl: string;
  carClasses: CarClass[];
}

export default function PhotoEstimateSheet({
  open,
  onClose,
  whatsappUrl,
  telegramUrl,
  maxUrl,
  carClasses,
}: PhotoEstimateSheetProps) {
  const pathname = usePathname();
  const isPpf = pathname === "/ppf";
  /** Услуга: подставлена по странице, клиент может поменять; выбор действует на этой странице */
  const [choice, setChoice] = useState<{ path: string | null; id: string } | null>(null);
  const service = choice && choice.path === pathname ? choice.id : serviceForPath(pathname);
  const setService = (id: string) => setChoice({ path: pathname, id });
  const [phone, setPhone] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  /** Автомобиль по желанию: модель из подбора либо класс вручную */
  const [pick, setPick] = useState<{ classLabel: string; brand?: string } | null>(null);
  const [carOpen, setCarOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const phoneRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    reachGoal(goals.CALLBACK_OPEN);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),[tabindex="0"]') || []).filter(el => el.getClientRects().length);
        const first = items[0], last = items[items.length - 1];
        if (!first) { e.preventDefault(); return; }
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
          e.preventDefault(); first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      previousFocus?.focus({ preventScroll: true });
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  async function submit() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) {
      setError("Введите номер телефона");
      phoneRef.current?.focus();
      return;
    }
    setSending(true);
    setError("");
    reachGoal(goals.CALLBACK_SUBMIT);
    const res = await submitForm({
      phone,
      carClass: pick?.classLabel,
      carBrand: pick?.brand || undefined,
      service: photoServiceText(service),
      channel: "Звонок",
      source: "photo-estimate",
    }, photos);
    setSending(false);
    if (res.success) {
      reachGoal(goals.FORM_SUCCESS);
      reachGoal(goals.CALLBACK_SUCCESS);
      setDone(true);
    } else {
      reachGoal(goals.FORM_ERROR);
      setError(res.error || "Не отправилось — попробуйте ещё раз или напишите в мессенджер");
    }
  }

  const messengers = [
    { href: whatsappUrl, label: "WhatsApp", goal: goals.WHATSAPP_CLICK, icon: <MessageCircle size={20} className="text-whatsapp" /> },
    { href: telegramUrl, label: "Telegram", goal: goals.TELEGRAM_CLICK, icon: <Send size={20} className="text-telegram" /> },
    { href: maxUrl, label: "Max", goal: goals.MAX_CLICK, icon: <MessageCircle size={20} className="text-max" /> },
  ];

  return (
    <div
      className={cn("fixed inset-0 z-[80]", !open && "pointer-events-none")}
      aria-hidden={!open}
      inert={!open}
      data-gate-new="шит «Расчёт по фото» по липкой кнопке: мессенджеры для фото и номер для звонка (владелец 04.09)"
    >
      {/* Фон: тап по нему закрывает */}
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-[rgba(0,0,0,0.6)] transition-opacity duration-250",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-estimate-title"
        className={cn(
          // shadow-card, а не shadow-sticky: по классу shadow-sticky гейт
          // anatomy-verify находит липкую панель и меряет её видимость
          "absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-2xl border-t border-line-strong bg-[rgba(10,10,12,0.96)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card backdrop-blur-[16px] transition-transform duration-250 ease-out",
          "lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[460px] lg:max-h-[85vh] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:border lg:p-7",
          open ? "translate-y-0 lg:-translate-y-1/2" : "translate-y-full lg:translate-y-[60vh]",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="photo-estimate-title" className="font-display text-h3 text-ink">
            Расчёт по фото
          </h2>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="ds-focus -mr-2 -mt-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-pill text-ink-secondary transition-colors duration-150 hover:text-ink"
          >
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div className="mt-4">
            <p className="text-body text-ink">Заявка принята — свяжемся в рабочее время.</p>
            <p className="mt-2 text-body-sm text-ink-secondary">
              {photos.length ? "Заявка и прикреплённые фотографии сохранены. Дополнительно отправлять их в мессенджер не нужно." : "Заявка сохранена. Свяжемся с вами, чтобы уточнить детали."}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {messengers.map((m) => (
                <a
                  key={m.label}
                  href={m.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => reachGoal(m.goal)}
                  className="ds-focus flex h-12 items-center justify-center gap-2 rounded-pill border border-line bg-surface text-body-sm font-semibold text-ink"
                >
                  {m.icon}
                  {m.label}
                </a>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="mt-2 text-body-sm text-ink-secondary">
              {isPpf ? "Сфотографируйте автомобиль и детали, которые хотите защитить. Мастер позвонит в рабочее время, обсудит зоны оклейки и стоимость." : "Приложите общий вид автомобиля и крупный план детали. Мастер позвонит в рабочее время, обсудит задачу и стоимость работ."}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
              className="mt-4 space-y-3"
            >
              {/* Одна строка, как поле телефона: 13 кнопок занимали на телефоне целый экран. */}
              <div className="flex flex-col gap-2">
                <label htmlFor="photo-service" className="text-body-sm text-ink">Что сделать?</label>
                <select
                  id="photo-service"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  disabled={sending}
                  className="ds-focus h-12 w-full min-w-0 rounded-md border border-line bg-surface px-4 text-[16px] text-ink transition-colors duration-150 focus:border-[rgba(var(--accent-rgb),0.6)] focus:outline-none"
                >
                  {PHOTO_SERVICES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <PhotoAttachments files={photos} onChange={setPhotos} disabled={sending} />
              <div className="flex flex-col gap-2">
                <label htmlFor="photo-phone" className="text-body-sm text-ink">Телефон для ответа</label>
                <input id="photo-phone"
                  ref={phoneRef}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  aria-label="Телефон"
                  placeholder="+7 ___ ___-__-__"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="ds-focus h-12 w-full min-w-0 rounded-md border border-line bg-surface px-4 text-[16px] text-ink placeholder:text-ink-tertiary transition-colors duration-150 focus:border-[rgba(var(--accent-rgb),0.6)] focus:outline-none"
                />

              </div>
              {error && (
                <p role="alert" className="text-caption text-[#d45555]">
                  {error}
                </p>
              )}
              {carOpen ? (
                <CarPicker
                  carClasses={carClasses}
                  onPick={(p: CarPick) => setPick({ classLabel: p.classLabel, brand: `${p.brand} ${p.model}` })}
                  onPickClass={(label) => setPick({ classLabel: label })}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setCarOpen(true)}
                  className="ds-focus text-body-sm text-ink-secondary underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:text-ink"
                >
                  Указать автомобиль — посчитаем точнее
                </button>
              )}
                <Button type="submit" fullWidth disabled={sending} className="flex-shrink-0">
                  {sending ? "Отправляем…" : "Отправить заявку"}
                </Button>
              <p className="text-caption text-ink-tertiary">Отправляя заявку и фотографии, вы соглашаетесь с <Link href="/privacy" className="underline">политикой конфиденциальности</Link>.</p>
            </form>
            <p className="mt-5 text-caption text-ink-secondary">Или напишите в мессенджер</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {messengers.map((m) => (
                <a
                  key={m.label}
                  href={m.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => reachGoal(m.goal)}
                  className="ds-focus flex h-12 items-center justify-center gap-2 rounded-pill border border-line bg-surface text-body-sm font-semibold text-ink transition-colors duration-150 hover:border-line-strong"
                >
                  {m.icon}
                  {m.label}
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
