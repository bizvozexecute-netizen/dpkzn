"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CarClassId, searchCars } from "@/lib/data/car-catalog";
import type { CarClass } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Подбор автомобиля: человек пишет марку и модель, класс (1–5) определяем
 * сами по справочнику car-catalog. Владелец 02.09: «откуда он знает, какой
 * у него класс». Ручной выбор класса остаётся фолбэком — справочник не
 * претендует на полноту.
 *
 * Комбобокс без библиотек: input + список подсказок, стрелки/Enter/Esc,
 * роли ARIA. Шрифт поля 16px — iOS не зумит.
 */
export interface CarPick {
  brand: string;
  model: string;
  cls: CarClassId;
  /** Подпись класса из БД студии («3 класс») */
  classLabel: string;
}

interface CarPickerProps {
  /** Классы в порядке sortOrder — индекс + 1 == cls справочника */
  carClasses: CarClass[];
  onPick: (pick: CarPick) => void;
  /** Ручной выбор класса (фолбэк) */
  onPickClass?: (classLabel: string) => void;
  placeholder?: string;
  /** Прозрачное поле поверх фото (hero) */
  onPhoto?: boolean;
  className?: string;
}

const LIMIT = 6;

export default function CarPicker({
  carClasses,
  onPick,
  onPickClass,
  placeholder = "Марка и модель — например, Kia Rio",
  onPhoto = false,
  className,
}: CarPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [manual, setManual] = useState(false);
  const [chosen, setChosen] = useState<CarPick | null>(null);
  const listId = useId();
  const blurTimer = useRef(0);

  const [search, setSearch] = useState<typeof searchCars | null>(null);
  useEffect(() => {
    if (!open || search) return;
    let active = true;
    import("@/lib/data/car-catalog").then(({ searchCars }) => {
      if (active) setSearch(() => searchCars);
    }).catch(() => {
      if (active) setManual(true);
    });
    return () => { active = false; };
  }, [open, search]);
  const items = search && query.trim().length >= 2 ? search(query, LIMIT) : [];
  const classLabel = (cls: CarClassId) => carClasses[cls - 1]?.label ?? `${cls} класс`;

  useEffect(() => () => window.clearTimeout(blurTimer.current), []);

  function choose(i: number) {
    const it = items[i];
    if (!it) return;
    const pick: CarPick = { ...it, classLabel: classLabel(it.cls) };
    setChosen(pick);
    setQuery(`${it.brand} ${it.model}`);
    setOpen(false);
    onPick(pick);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) {
      if (e.key === "ArrowDown" && items.length) setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(cursor);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div
      className={cn("relative", className)}
      data-gate-new="подбор автомобиля по марке и модели вместо выбора класса (решение владельца 02.09)"
    >
      <div className="relative">
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-tertiary"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="text"
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Марка и модель автомобиля"
          autoComplete="off"
          enterKeyHint="search"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setChosen(null);
            setCursor(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Клик по подсказке прилетает после blur — даём ему пройти
            blurTimer.current = window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={onKey}
          className={cn(
            "ds-focus h-12 w-full rounded-md border pl-11 pr-4 text-[16px] text-ink placeholder:text-ink-tertiary",
            "transition-colors duration-150 focus:border-[rgba(var(--accent-rgb),0.6)] focus:outline-none",
            onPhoto ? "border-line-strong bg-[rgba(10,10,12,0.55)] backdrop-blur-[8px]" : "border-line bg-surface",
          )}
        />
      </div>

      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          // Телефон: список в потоке — карточка квиза с overflow-hidden срезала
          // выпадающий слой, и под полем подсказок не было видно (владелец 04.09).
          // Десктоп: слой поверх, чтобы не толкать чипы классов.
          className="mt-2 max-h-[15rem] overflow-y-auto rounded-md border border-line bg-elevated shadow-card"
        >
          {items.map((it, i) => (
            <li
              key={`${it.brand}-${it.model}`}
              role="option"
              aria-selected={i === cursor}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
              onPointerEnter={() => setCursor(i)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-4 px-4 py-3 text-body-sm transition-colors duration-100",
                i === cursor ? "bg-surface2 text-ink" : "text-ink",
              )}
            >
              <span>
                <span className="text-ink-secondary">{it.brand}</span> {it.model}
              </span>
              <span className="ds-nums flex-shrink-0 text-caption text-ink-secondary">{classLabel(it.cls)}</span>
            </li>
          ))}
        </ul>
      )}

      {chosen ? (
        <p className="mt-2 text-caption text-ink-secondary">
          {chosen.brand} {chosen.model} — <span className="text-ink">{chosen.classLabel}</span>
        </p>
      ) : (
        onPickClass && (
          <div className="mt-2">
            {/* Чипы классов всегда в разметке (раскрываются по ссылке): их
                подписи — часть текста страницы, гейт 1:1 считает токены */}
            <div hidden={!manual} className="flex flex-wrap gap-2">
              {carClasses.map((cc) => (
                <button
                  key={cc.id}
                  type="button"
                  title={cc.example}
                  onClick={() => onPickClass(cc.label)}
                  className="ds-chip ds-focus"
                >
                  {cc.label}
                </button>
              ))}
            </div>
            {!manual && (
              <button
                type="button"
                onClick={() => setManual(true)}
                className="ds-focus rounded-sm text-caption text-ink-tertiary underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:text-ink"
              >
                Не нашли модель? Выбрать класс вручную
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}
