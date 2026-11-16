"use client";

import { useId, useState } from "react";
import { sendQuizPreset } from "@/lib/redesign/events";
import Button from "./Button";

/**
 * Клиентские островки прайса.
 *
 * Сама таблица рендерится на сервере и не гидрируется: это самый большой кусок
 * разметки на странице услуги, и его гидратация была главной статьёй в TBT.
 * Здесь остаётся только то, что действительно интерактивно — селектор класса,
 * раскрытие поэлементного списка и кнопка «В расчёт».
 *
 * Островки не хранят разметку таблицы: они переключают data-атрибут на
 * контейнере, а какие ячейки показать, решает CSS (см. tokens.css).
 */

/** Ищем контейнер прайса вверх по дереву — островок не знает о структуре таблицы. */
function setOnPrice(el: HTMLElement | null, attr: string, value: string) {
  el?.closest<HTMLElement>("[data-price-root]")?.setAttribute(attr, value);
}

export function PriceClassSelector({
  classes,
  hint,
}: {
  classes: { id: number; label: string }[];
  hint?: string;
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="md:hidden">
      <p className="mb-3 text-body-sm font-semibold text-ink">Выберите класс автомобиля</p>
      <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
        <div className="flex gap-2">
          {classes.map((cc, i) => (
            <button
              key={cc.id}
              type="button"
              aria-pressed={i === active}
              onClick={(e) => {
                setActive(i);
                setOnPrice(e.currentTarget, "data-active-class", String(i));
              }}
              className="ds-chip ds-focus flex-shrink-0"
            >
              {cc.label}
            </button>
          ))}
        </div>
      </div>
      {hint && <p className="mt-3 text-caption text-ink-secondary">{hint}</p>}
    </div>
  );
}

export function ElementsToggle() {
  const [open, setOpen] = useState(false);
  const id = useId();

  if (open) return null;

  return (
    <Button
      id={id}
      variant="ghost"
      size="sm"
      className="mt-4 px-0"
      onClick={(e) => {
        setOpen(true);
        setOnPrice(e.currentTarget, "data-elements", "all");
      }}
    >
      Показать все элементы
    </Button>
  );
}

export function AddToQuizButton({ packageName, fullWidth }: { packageName: string; fullWidth?: boolean }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      fullWidth={fullWidth}
      className={fullWidth ? "mt-6" : "mt-4"}
      onClick={() => sendQuizPreset({ packageName })}
    >
      В расчёт
    </Button>
  );
}
