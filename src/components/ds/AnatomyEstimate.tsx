"use client";

import type { CarPick } from "./CarPicker";
import LeadForm from "./LeadForm";
import { X } from "./icons";
import type { AnatomyZone } from "./Anatomy";
import type { CarClass } from "@/lib/types";

/**
 * Смета по выбранным зонам: на десктопе — карточка справа от чипов под
 * кадром, на мобиле — сводка под блоком. Владелец 03.09: «на схеме Audi,
 * у пользователя другая машина — нужен CTA «укажите марку, посчитаем под
 * вас»; «список выбранного не должен скроллиться внутри кадра».
 *
 * Строка сметы — зона и выбранная для неё услуга (по умолчанию главная —
 * PPF/бронирование, меняется в карточке зоны), сумма — по этим услугам.
 * Под суммой — форма телефона с подбором автомобиля (23.09.2026); переход в
 * квиз остался вторичной ссылкой для тех, кто хочет посчитать сам.
 */
interface AnatomyEstimateProps {
  zones: AnatomyZone[];
  /** Индекс выбранной услуги по зоне; нет — первая */
  choice?: Record<string, number>;
  estimateFrom: number;
  carClasses: CarClass[];
  onRemove: (zoneId: string) => void;
  onEstimate: (pick: CarPick | null) => void;
  /** Строка сезонной акции, когда выбор совпал с её зонами */
  seasonNote?: string | null;
  className?: string;
}

export default function AnatomyEstimate({
  zones,
  choice = {},
  estimateFrom,
  carClasses,
  onRemove,
  onEstimate,
  seasonNote,
  className,
}: AnatomyEstimateProps) {
  // Строки для мастера: не «Капот», а «Капот — Антигравийная плёнка»
  const lines = zones.map((z) => {
    const svc = z.services[choice[z.id] ?? 0] ?? z.services[0];
    return svc ? `${z.label} — ${svc.title}` : z.label;
  });

  return (
    <div className={className}>
      <p className="text-caption text-ink-secondary">
        Ваш выбор: <span className="ds-nums text-ink">{zones.length}</span>{" "}
        {zones.length === 1 ? "зона" : zones.length < 5 ? "зоны" : "зон"}
      </p>
      <ul className="mt-2 divide-y divide-line">
        {zones.map((z) => {
          const svc = z.services[choice[z.id] ?? 0] ?? z.services[0];
          return (
            <li key={z.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm text-ink">{z.label}</span>
                {svc && <span className="block truncate text-caption text-ink-secondary">{svc.title}</span>}
              </span>
              {svc && (
                <span className="ds-nums flex-shrink-0 text-caption text-ink">
                  от {svc.priceFrom.toLocaleString("ru-RU")} ₽
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemove(z.id)}
                aria-label={`Убрать зону «${z.label}»`}
                className="ds-focus -mr-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-pill text-ink-tertiary hover:text-ink"
              >
                <X size={12} />
              </button>
            </li>
          );
        })}
      </ul>

      <p className="ds-nums mt-3 font-display text-h4 text-ink">от {estimateFrom.toLocaleString("ru-RU")} ₽</p>
      {seasonNote && (
        <p className="mt-1 flex items-center gap-2 text-caption text-accent">
          <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-pill bg-accent" />
          {seasonNote}
        </p>
      )}
      <p className="mt-1 text-caption text-ink-tertiary">
        По выбранным услугам, цены «от». На схеме Audi RS Q8 — точная цена зависит от класса вашего авто
      </p>

      {/* Телефон прямо в смете (владелец 23.09.2026: «мы не везде забираем
          телефон»). Раньше кнопка уводила в квиз, а на телефоне квиз за месяц
          не довёл ни одного человека. Здесь человек уже собрал набор и видит
          цену — самый тёплый момент. Зоны с услугами и сумма уходят в заявку. */}
      <LeadForm
        source="anatomy-estimate"
        gateNote="телефон в смете анатомии вместо перехода в квиз (владелец 23.09.2026)"
        variant="expanded"
        title="Точная цена для вашей машины"
        carClasses={carClasses}
        submitLabel="Узнать цену"
        hint="Перезвоним и назовём цену для вашего автомобиля."
        service={`Анатомия: ${zones.length} ${zones.length === 1 ? "зона" : zones.length < 5 ? "зоны" : "зон"}, от ${estimateFrom.toLocaleString("ru-RU")} ₽`}
        extra={{ services: lines }}
        className="mt-4"
      />

      <button
        type="button"
        onClick={() => onEstimate(null)}
        className="ds-focus mt-3 text-body-sm text-ink-secondary underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:text-ink"
      >
        или посчитать подробнее в калькуляторе
      </button>
    </div>
  );
}
