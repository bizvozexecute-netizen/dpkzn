"use client";

import type { RefObject } from "react";
import { cn } from "@/lib/utils";

/**
 * Поле телефона для всех форм захвата. Мобильные правила зашиты здесь, чтобы
 * не разъехаться по шести местам — не «оптимизировать»:
 *
 * - text-[16px] литералом. НЕ text-body-sm: это 15px, и iOS Safari зумит страницу
 *   при фокусе на любом поле мельче 16px.
 * - h-12 = 48px: тап-зона выше порога 44px.
 * - type=tel + inputMode + autoComplete: цифровая клавиатура и автозаполнение
 *   номера одним тапом.
 * - Слот ошибки фиксированной высоты: появление ошибки не двигает то, что ниже.
 *   В первом экране это был бы сдвиг макета прямо в окне LCP.
 */
interface PhoneFieldProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  error?: string;
  shake?: boolean;
  /** Прозрачное поле поверх постера первого экрана */
  onPhoto?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  /** id подписи — для aria-describedby */
  describedBy?: string;
  className?: string;
}

export default function PhoneField({
  value,
  onChange,
  onFocus,
  onBlur,
  error,
  shake,
  onPhoto = false,
  inputRef,
  describedBy,
  className,
}: PhoneFieldProps) {
  return (
    <input
      ref={inputRef}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      enterKeyHint="send"
      aria-label="Телефон"
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={describedBy}
      placeholder="+7 ___ ___-__-__"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      className={cn(
        "ds-focus h-12 min-w-0 flex-1 rounded-md border px-4 text-[16px] text-ink placeholder:text-ink-tertiary",
        "transition-colors duration-150 focus:border-[rgba(var(--accent-rgb),0.6)] focus:outline-none",
        onPhoto ? "border-line-strong bg-[rgba(10,10,12,0.55)] backdrop-blur-[8px]" : "border-line bg-surface",
        error && "border-error",
        shake && "ds-shake",
        className,
      )}
    />
  );
}
