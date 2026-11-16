"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Check, MessageCircle, Phone, Send } from "./icons";
import type { CarClass } from "@/lib/types";
import { submitForm } from "@/lib/form-submit";
import CarPicker from "./CarPicker";
import { reachGoal, goals } from "@/lib/analytics";
import { QUIZ_PRESET_EVENT, sendQuizContactStep, type QuizPresetDetail } from "@/lib/redesign/events";
import { cn, formatPhoneInput } from "@/lib/utils";
import Button from "./Button";
import PhotoAttachments from "./PhotoAttachments";

/**
 * Квиз-калькулятор (ДС §4.3) — ЕДИНСТВЕННАЯ форма страницы.
 *
 * Телефон спрашиваем последним: три шага без личных данных дают человеку понять,
 * что считают именно его случай, и заметно поднимают долю доходящих до контакта.
 *
 * Отклонение от ДС §4.3: высоту контейнера не анимируем. §5 запрещает анимировать
 * height в кадре, и этот запрет прямее — шаги отличаются по высоте незначительно,
 * а дёрганый layout на слабых телефонах заметнее, чем отсутствие плавности.
 */

export interface QuizOption {
  value: string;
  label: string;
  hint?: string;
}

interface QuizProps {
  /** Слаг услуги — уходит в заявку, чтобы мастер видел страницу входа */
  serviceSlug?: string;
  serviceName?: string;
  carClasses: CarClass[];
  /** Шаг 2. Пусто — шаг пропускается (модель прайса «одна позиция») */
  options?: QuizOption[];
  optionsTitle?: string;
  /** Зоны оклейки и подобные наборы выбираются пачкой */
  multiple?: boolean;
  /** Слот под «Анатомию»: получает то же состояние выбора, что и шаг 2 —
   *  один источник правды, две проекции (03-feature-anatomy-3d.md §5) */
  optionsExtra?: (ctx: { selected: string[]; toggle: (value: string) => void }) => ReactNode;
  /** Заголовок и подпись контейнера. Выключаются, когда их даёт секция страницы */
  hideHeading?: boolean;
  whatsappUrl: string;
  telegramUrl: string;
  className?: string;
}

const URGENCY: QuizOption[] = [
  { value: "На этой неделе", label: "На этой неделе" },
  { value: "В этом месяце", label: "В этом месяце" },
  { value: "Пока считаю", label: "Пока считаю" },
];

const CHANNELS = [
  { value: "WhatsApp", label: "WhatsApp", Icon: MessageCircle, color: "text-whatsapp" },
  { value: "Telegram", label: "Telegram", Icon: Send, color: "text-telegram" },
  { value: "Max", label: "Max", Icon: MessageCircle, color: "text-max" },
  { value: "Звонок", label: "Звонок", Icon: Phone, color: "text-ink-secondary" },
] as const;

function OptionCard({
  selected,
  onClick,
  label,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "ds-focus flex min-h-[56px] w-full items-center justify-between gap-3 rounded-md border p-4 text-left transition-colors duration-250",
        selected ? "border-accent bg-accent-subtle" : "border-line bg-surface hover:border-line-strong",
      )}
    >
      <span>
        <span className="block text-body-sm font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-caption text-ink-secondary">{hint}</span>}
      </span>
      {selected && <Check size={18} className="flex-shrink-0 text-accent" />}
    </button>
  );
}

export default function Quiz({
  serviceSlug,
  serviceName,
  carClasses,
  options = [],
  optionsTitle = "Что делаем?",
  multiple = false,
  optionsExtra,
  hideHeading = false,
  whatsappUrl,
  telegramUrl,
  className,
}: QuizProps) {
  const hasOptionsStep = options.length > 0;
  const isPpf = serviceSlug === "ppf";
  const afterOptions = isPpf ? 4 : 3;
  const steps = useMemo(() => [1, ...(hasOptionsStep ? [2] : []), ...(isPpf ? [] : [3]), 4], [hasOptionsStep, isPpf]);

  const [step, setStep] = useState(1);
  const [carClass, setCarClass] = useState("");
  /** Марка и модель из справочника; пусто при ручном выборе класса */
  const [carBrand, setCarBrand] = useState("");
  // Ref нужен обработчику пресета: он подписан один раз, а автомобиль
  // человек может назвать позже; писать в ref во время рендера нельзя
  const carClassRef = useRef(carClass);
  useEffect(() => {
    carClassRef.current = carClass;
  }, [carClass]);
  const [picked, setPicked] = useState<string[]>([]);
  const [presetScope, setPresetScope] = useState(false);
  const [urgency, setUrgency] = useState("");
  const [channel, setChannel] = useState<string>("WhatsApp");
  const [phone, setPhone] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const labels = picked.map((value) => options.find((option) => option.value === value)?.label ?? value);
  const index = steps.indexOf(step);
  const isContactStep = step === 4;

  // Sticky CTA прячется на шаге контакта: два одинаковых призыва в одном экране
  // заставляют выбирать, а не действовать.
  useEffect(() => {
    sendQuizContactStep(isContactStep && !done);
    return () => sendQuizContactStep(false);
  }, [isContactStep, done]);

  // Прайс и «Анатомия» подставляют выбор и проматывают сюда.
  useEffect(() => {
    const onPreset = (e: Event) => {
      const detail = (e as CustomEvent<QuizPresetDetail>).detail;
      // Мини-старт из hero: класс выбран, шаг 1 пройден
      // Через ref: эффект подписан один раз, а автомобиль мог быть выбран позже
      const carKnown = Boolean(detail?.carClass || carClassRef.current);
      if (detail?.carClass) {
        setCarClass(detail.carClass);
        setCarBrand(detail.carBrand ?? "");
        setStep((s) => (s < 2 ? 2 : s));
      }
      const values = detail?.zones ?? (detail?.packageName ? [detail.packageName] : []);
      if (values.length === 0) return;
      setPresetScope(isPpf);
      setPicked(multiple ? values : values.slice(0, 1));
      // Зоны уже выбраны в «Анатомии» или прайсе: если автомобиль известен —
      // сразу к срокам; если нет — с вопроса об автомобиле, выбор зон
      // сохраняется и покажется на шаге 2 для подтверждения
      setStep(carKnown ? afterOptions : 1);
    };
    window.addEventListener(QUIZ_PRESET_EVENT, onPreset);
    return () => window.removeEventListener(QUIZ_PRESET_EVENT, onPreset);
  }, [multiple, afterOptions, isPpf]);

  function go(next: number) {
    setStep(next);
    if (next === 2) reachGoal(goals.QUIZ_STEP_2);
    if (next === 3) reachGoal(goals.QUIZ_STEP_3);
    if (next === 4) reachGoal(goals.QUIZ_STEP_4);
  }

  function back() {
    setPresetScope(false);
    const prev = steps[Math.max(0, index - 1)];
    setStep(prev);
  }

  function togglePicked(value: string) {
    setPicked((prev) => {
      if (!multiple) return [value];
      return prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 11) {
      setError("Введите корректный номер");
      setShake(true);
      window.setTimeout(() => setShake(false), 220);
      return;
    }

    setSending(true);
    reachGoal(goals.QUIZ_SUBMIT);

    // В заявку уходят человекочитаемые названия: значения опций могут быть
    // техническими (id зон кузова для синка с «Анатомией»).


    const result = await submitForm({
      phone,
      carClass,
      carBrand: carBrand || undefined,
      service: serviceName,
      services: labels,
      urgency,
      channel,
      source: serviceSlug ? `quiz:${serviceSlug}` : "quiz",
    }, photos);

    setSending(false);
    if (result.success) {
      reachGoal(goals.QUIZ_SUCCESS);
      setDone(true);
    } else {
      setError(result.error || "Ошибка отправки");
    }
  }

  if (done) {
    return (
      <div className={cn("rounded-xl border border-line bg-elevated p-6 text-center md:p-10", className)}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-accent-subtle">
          <Check size={28} className="text-accent" />
        </div>
        <p className="mt-5 font-display text-h3 text-ink">Заявка у мастера</p>
        <p className="mt-3 text-body-sm text-ink-secondary">
          Ответим в рабочее время
        </p>
        <div className="mx-auto mt-6 flex max-w-sm flex-col gap-2 sm:flex-row">
          <Button
            href={whatsappUrl}
            variant="messenger"
            size="sm"
            fullWidth
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
            fullWidth
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => reachGoal(goals.TELEGRAM_CLICK)}
          >
            <Send size={18} className="text-telegram" />
            Telegram
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-line bg-elevated", className)}>
      {/* Прогресс — тонкая линия поверх контейнера */}
      <div className="h-0.5 w-full bg-line">
        <div
          className="h-full bg-accent transition-[width] duration-250 ease-out"
          style={{ width: `${((index + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div className="p-6 md:p-10">
        <div className="flex items-center gap-3">
          {index > 0 && (
            <button
              type="button"
              onClick={back}
              aria-label="Назад"
              className="ds-focus -ml-1 flex h-8 w-8 items-center justify-center rounded-pill text-ink-secondary transition-colors duration-150 hover:text-ink"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <span className="text-caption text-ink-secondary">
            Шаг {index + 1} из {steps.length}
          </span>
        </div>

        {!hideHeading && (
          <>
            <h3 className="mt-4 font-display text-h3 text-ink">Расчёт стоимости</h3>
            <p className="mt-2 text-body-sm text-ink-secondary">Расчёт по фото</p>
          </>
        )}

        <div key={step} className="ds-step mt-7">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-body font-semibold text-ink">Какой у вас автомобиль?</p>
              {/* Марка и модель → класс определяем сами (владелец 02.09: «откуда
                  он знает свой класс»); ручной выбор класса — фолбэк внутри */}
              <CarPicker
                carClasses={carClasses}
                onPick={(p) => {
                  setCarClass(p.classLabel);
                  setCarBrand(`${p.brand} ${p.model}`);
                  reachGoal(goals.QUIZ_START);
                  go(hasOptionsStep && !presetScope ? 2 : afterOptions);
                }}
                onPickClass={(label) => {
                  setCarClass(label);
                  setCarBrand("");
                  reachGoal(goals.QUIZ_START);
                  go(hasOptionsStep && !presetScope ? 2 : afterOptions);
                }}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-body font-semibold text-ink">{optionsTitle}</p>
              {optionsExtra?.({ selected: picked, toggle: togglePicked })}
              {options.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  hint={opt.hint}
                  selected={picked.includes(opt.value)}
                  onClick={() => {
                    togglePicked(opt.value);
                    if (!multiple) go(afterOptions);
                  }}
                />
              ))}
              {multiple && (
                <Button fullWidth className="mt-2" disabled={picked.length === 0} onClick={() => go(afterOptions)}>
                  Далее
                </Button>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-body font-semibold text-ink">Когда планируете?</p>
              {URGENCY.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  selected={urgency === opt.value}
                  onClick={() => {
                    setUrgency(opt.value);
                    go(4);
                  }}
                />
              ))}
            </div>
          )}

          {step === 4 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-body font-semibold text-ink">Куда прислать расчёт?</p>

              {isPpf && picked.length > 0 && (
                <p className="text-body-sm text-ink-secondary">{[carBrand || carClass, ...labels].filter(Boolean).join(" · ")}</p>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CHANNELS.map(({ value, label, Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setChannel(value)}
                    aria-pressed={channel === value}
                    className={cn(
                      "ds-focus flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-md border transition-colors duration-250",
                      channel === value ? "border-accent bg-accent-subtle" : "border-line bg-surface hover:border-line-strong",
                    )}
                  >
                    <Icon size={18} className={color} />
                    <span className="text-caption text-ink">{label}</span>
                  </button>
                ))}
              </div>

              <div>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  aria-label="Телефон"
                  aria-invalid={Boolean(error)}
                  placeholder="+7 (___) ___-__-__"
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatPhoneInput(e.target.value));
                    setError("");
                  }}
                  className={cn(
                    "h-14 w-full rounded-md border bg-surface px-4 text-body text-ink outline-none transition-colors duration-150 placeholder:text-ink-secondary",
                    "focus:border-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
                    error ? "border-error" : "border-line",
                    shake && "ds-shake",
                  )}
                />
                {error && <p className="mt-2 text-caption text-error">{error}</p>}
              </div>

              <PhotoAttachments files={photos} onChange={setPhotos} disabled={sending} />
              <Button type="submit" fullWidth disabled={sending}>
                {sending ? "Отправляем…" : "Получить расчёт"}
              </Button>

              <p className="text-caption text-ink-secondary">
                Отправляя заявку, вы соглашаетесь с{" "}
                <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
                  политикой конфиденциальности
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
