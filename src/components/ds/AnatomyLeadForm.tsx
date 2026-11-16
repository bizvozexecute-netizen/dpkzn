"use client";

import { useState } from "react";
import Button from "./Button";
import CarPicker, { type CarPick } from "./CarPicker";
import type { AnatomyZone } from "./Anatomy";
import type { CarClass } from "@/lib/types";
import { submitForm } from "@/lib/form-submit";
import { goals, reachGoal } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Заявка прямо из шита анатомии на мобиле (владелец 03.09: «в шите нет
 * кнопки заказать — пусть тут сразу номер забирает»). Внизу шита: итог по
 * выбранным зонам, поле телефона и кнопка. Автомобиль — по желанию, за
 * ссылкой: на телефоне каждое лишнее поле режет конверсию, менеджер
 * уточнит модель при звонке.
 *
 * В заявку уходят зоны с выбранными услугами — менеджер видит не «Капот»,
 * а «Капот — Антигравийная плёнка».
 */
interface AnatomyLeadFormProps {
  zones: AnatomyZone[];
  choice: Record<string, number>;
  estimateFrom: number;
  carClasses: CarClass[];
  seasonNote?: string | null;
  className?: string;
}

export default function AnatomyLeadForm({
  zones,
  choice,
  estimateFrom,
  carClasses,
  seasonNote,
  className,
}: AnatomyLeadFormProps) {
  const [phone, setPhone] = useState("");
  const [pick, setPick] = useState<CarPick | null>(null);
  const [carOpen, setCarOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const lines = zones.map((z) => {
    const svc = z.services[choice[z.id] ?? 0] ?? z.services[0];
    return svc ? `${z.label} — ${svc.title}` : z.label;
  });

  async function submit() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Введите номер телефона");
      return;
    }
    setSending(true);
    setError("");
    reachGoal(goals.QUIZ_SUBMIT);
    const res = await submitForm({
      phone,
      carClass: pick?.classLabel,
      carBrand: pick && pick.brand ? `${pick.brand} ${pick.model}` : undefined,
      service: `Анатомия: ${zones.length} ${zones.length === 1 ? "зона" : "зон"}, от ${estimateFrom.toLocaleString("ru-RU")} ₽`,
      services: lines,
      channel: "Звонок",
      source: "anatomy-sheet",
    });
    setSending(false);
    if (res.success) {
      reachGoal(goals.QUIZ_SUCCESS);
      setDone(true);
    } else {
      setError(res.error || "Не отправилось — попробуйте ещё раз или позвоните");
    }
  }

  if (done) {
    return (
      <div className={cn("rounded-md border border-line bg-surface p-4", className)}>
        <p className="text-body font-semibold text-ink">Заявка принята — свяжемся в рабочее время</p>
        <p className="mt-1 text-caption text-ink-secondary">
          {zones.length} {zones.length === 1 ? "зона" : "зон"} · от {estimateFrom.toLocaleString("ru-RU")} ₽
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-caption text-ink-secondary">
          Итого: {zones.length} {zones.length === 1 ? "зона" : zones.length < 5 ? "зоны" : "зон"}
        </p>
        <p className="ds-nums font-display text-h4 text-ink">от {estimateFrom.toLocaleString("ru-RU")} ₽</p>
      </div>
      {seasonNote && (
        <p className="mt-1 flex items-center gap-2 text-caption text-accent">
          <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-pill bg-accent" />
          {seasonNote}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+7 ___ ___-__-__"
          aria-label="Телефон"
          className="ds-focus h-12 min-w-0 flex-1 rounded-md border border-line bg-surface px-4 text-[16px] text-ink placeholder:text-ink-tertiary focus:border-[rgba(var(--accent-rgb),0.6)] focus:outline-none"
        />
        <Button size="sm" className="h-12 flex-shrink-0" onClick={submit} disabled={sending}>
          {sending ? "Отправляем…" : "Получить расчёт"}
        </Button>
      </div>
      {error && <p className="mt-2 text-caption text-[#d45555]">{error}</p>}

      {carOpen ? (
        <div className="mt-3">
          <p className="text-caption text-ink-secondary">Ваш автомобиль</p>
          <CarPicker
            className="mt-1.5"
            carClasses={carClasses}
            placeholder="Марка и модель"
            onPick={setPick}
            onPickClass={(label) =>
              setPick({
                brand: "",
                model: "",
                cls: (carClasses.findIndex((c) => c.label === label) + 1 || 1) as CarPick["cls"],
                classLabel: label,
              })
            }
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCarOpen(true)}
          className="ds-focus mt-2 rounded-sm text-caption text-ink-tertiary underline decoration-line-strong underline-offset-4 hover:text-ink"
        >
          {pick ? `${pick.brand} ${pick.model} · ${pick.classLabel}` : "Указать автомобиль — посчитаем точнее"}
        </button>
      )}
      <p className="mt-2 text-caption text-ink-tertiary">На схеме Audi RS Q8 — точная цена зависит от класса вашего авто</p>
    </div>
  );
}
