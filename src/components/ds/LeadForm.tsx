"use client";

import dynamic from "next/dynamic";
import { useId, useState, type ReactNode } from "react";
import Button from "./Button";
import PhoneField from "./PhoneField";
import { Check, MessageCircle, Send } from "./icons";
import type { CarPick } from "./CarPicker";
import type { CarClass } from "@/lib/types";
import type { FormData } from "@/lib/form-submit";
import { useLeadSubmit, type GoalSet } from "@/lib/use-lead-submit";
import { sendLeadFocus } from "@/lib/redesign/events";
import { goals, reachGoal } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Форма захвата телефона — одна на все места сайта (владелец 23.09: «мы не
 * везде забираем телефон»). На телефоне 19 стартов квиза за месяц дали ноль
 * заявок: четыре шага до поля телефона — слишком длинный путь. Эта форма —
 * короткий путь: одно поле и кнопка.
 *
 * Два вида:
 * - inline — поле и кнопка в строку. Кнопка в строке и на телефоне тоже:
 *   столбиком она растянула бы первый экран, а постер выпал бы из LCP.
 * - expanded — плюс подбор автомобиля сразу раскрытым.
 *
 * Каталог авто (43 КБ) грузится лениво, только когда подбор реально открыт.
 *
 * Гейт. Корень несёт data-gate-new из обязательного gateNote — без него
 * scripts/content-diff.mjs завалит сборку на новых словах. Заголовок формы —
 * всегда <p>: шесть форм не должны добавить странице шесть H2.
 *
 * Автофокуса нет намеренно: в первом экране он поднял бы клавиатуру на
 * загрузке и сломал бы и LCP, и раскладку.
 */
const CarPicker = dynamic(() => import("./CarPicker"), { ssr: false });

export type LeadFormVariant = "inline" | "expanded";

export interface LeadFormProps {
  /** Уникальный источник заявки — строка в /admin/report. Место, а не страница */
  source: string;
  /** Причина появления блока для SEO-гейта → data-gate-new на корне */
  gateNote: string;
  variant?: LeadFormVariant;
  /** Поверх постера первого экрана */
  onPhoto?: boolean;
  /** Подпись над полем (всегда <p>) */
  title?: string;
  /** Микрокопия под полем */
  hint?: string;
  submitLabel?: string;
  /** Короткая подпись кнопки для узких экранов */
  submitLabelShort?: string;
  doneTitle?: string;
  doneText?: string;
  /** Классы авто для подбора; без них подбор не показывается */
  carClasses?: CarClass[];
  /** inline: ссылка «Указать автомобиль» раскрывает подбор */
  carOptional?: boolean;
  messengers?: { whatsappUrl: string; telegramUrl: string; maxUrl?: string };
  /** Название услуги — H1 страницы услуги */
  service?: string;
  /** Прочее в заявку: зоны анатомии, срочность */
  extra?: Partial<FormData>;
  goals?: GoalSet;
  renderDone?: () => ReactNode;
  className?: string;
}

export default function LeadForm({
  source,
  gateNote,
  variant = "inline",
  onPhoto = false,
  title,
  hint,
  submitLabel = "Узнать цену",
  submitLabelShort,
  doneTitle = "Заявка принята — свяжемся в рабочее время",
  doneText,
  carClasses,
  carOptional = false,
  messengers,
  service,
  extra,
  goals: goalSet = "form",
  renderDone,
  className,
}: LeadFormProps) {
  const hintId = useId();
  const [car, setCar] = useState<{ classLabel: string; brand?: string } | null>(null);
  const [carOpen, setCarOpen] = useState(variant === "expanded");
  const canPickCar = Boolean(carClasses?.length);

  const lead = useLeadSubmit({
    source,
    goals: goalSet,
    payload: () => ({
      ...(service ? { service } : {}),
      ...(car ? { carClass: car.classLabel, carBrand: car.brand } : {}),
      ...extra,
    }),
  });

  if (lead.done) {
    return (
      <div className={cn("rounded-lg border border-line bg-surface p-5", className)} data-gate-new={gateNote} role="status">
        {renderDone ? (
          renderDone()
        ) : (
          <>
            <p className="flex items-center gap-2 text-body font-semibold text-ink">
              <Check size={18} className="flex-shrink-0 text-accent" />
              {doneTitle}
            </p>
            {doneText && <p className="mt-2 text-body-sm text-ink-secondary">{doneText}</p>}
            {messengers && <Messengers {...messengers} className="mt-4" />}
          </>
        )}
      </div>
    );
  }

  return (
    <form
      noValidate
      data-gate-new={gateNote}
      className={cn("ds-lead-form relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        void lead.submit();
      }}
    >
      {title && <p className="mb-2.5 text-body-sm font-semibold text-ink">{title}</p>}

      <div className="ds-lead-fields flex gap-2">
        <PhoneField
          value={lead.phone}
          onChange={lead.setPhone}
          onFocus={() => {
            lead.markOpen();
            sendLeadFocus(true);
          }}
          onBlur={() => sendLeadFocus(false)}
          error={lead.error}
          shake={lead.shake}
          onPhoto={onPhoto}
          describedBy={hint ? hintId : undefined}
        />
        <Button type="submit" disabled={lead.sending} className="h-12 flex-shrink-0 px-5 md:h-12 md:px-6">
          {lead.sending ? (
            "Отправляем…"
          ) : submitLabelShort ? (
            <>
              <span className="sm:hidden">{submitLabelShort}</span>
              <span className="hidden sm:inline">{submitLabel}</span>
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>

      {/* Ловушка для ботов: вне экрана, вне фокуса и вне дерева доступности.
          Не display:none — такие поля многие боты пропускают */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={lead.trap}
        onChange={(e) => lead.setTrap(e.target.value)}
        className="pointer-events-none absolute left-[-9999px] h-px w-px opacity-0"
      />

      {/* Слот ошибки фиксированной высоты — её появление ничего не сдвигает */}
      <p role="alert" className="min-h-[1.25rem] pt-1 text-caption text-error">
        {lead.error}
      </p>

      {canPickCar && (carOpen ? (
        <div className="mt-1">
          <CarPicker
            carClasses={carClasses!}
            onPhoto={onPhoto}
            onPick={(p: CarPick) => setCar({ classLabel: p.classLabel, brand: `${p.brand} ${p.model}` })}
            onPickClass={(label) => setCar({ classLabel: label })}
          />
        </div>
      ) : (
        carOptional && (
          <button
            type="button"
            onClick={() => setCarOpen(true)}
            className="ds-focus text-body-sm text-ink-secondary underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:text-ink"
          >
            Указать автомобиль — посчитаем точнее
          </button>
        )
      ))}

      {hint && (
        <p id={hintId} className="mt-2 text-caption text-ink-tertiary">
          {hint}
        </p>
      )}
    </form>
  );
}

function Messengers({
  whatsappUrl,
  telegramUrl,
  maxUrl,
  className,
}: {
  whatsappUrl: string;
  telegramUrl: string;
  maxUrl?: string;
  className?: string;
}) {
  const items = [
    { href: whatsappUrl, label: "WhatsApp", goal: goals.WHATSAPP_CLICK, icon: <MessageCircle size={18} className="text-whatsapp" /> },
    { href: telegramUrl, label: "Telegram", goal: goals.TELEGRAM_CLICK, icon: <Send size={18} className="text-telegram" /> },
    ...(maxUrl ? [{ href: maxUrl, label: "Max", goal: goals.MAX_CLICK, icon: <MessageCircle size={18} className="text-max" /> }] : []),
  ];
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {items.map((m) => (
        <a
          key={m.label}
          href={m.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => reachGoal(m.goal)}
          className="ds-focus flex h-11 items-center gap-2 rounded-pill border border-line bg-surface px-4 text-body-sm font-semibold text-ink transition-colors duration-150 hover:border-line-strong"
        >
          {m.icon}
          {m.label}
        </a>
      ))}
    </div>
  );
}
