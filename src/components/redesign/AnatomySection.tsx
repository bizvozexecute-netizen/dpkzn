"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { AnatomyData, AnatomyIndexMap } from "@/components/ds/Anatomy";
import AnatomyEstimate from "@/components/ds/AnatomyEstimate";
import type { CarPick } from "@/components/ds/CarPicker";
import { sendQuizPreset } from "@/lib/redesign/events";
import { ANATOMY_ASSETS_VERSION } from "@/lib/redesign/anatomy-version";
import { withExtraZones } from "@/lib/redesign/anatomy-extra";
import { RISK_ZONES, seasonBenefit, seasonIsLive } from "@/lib/redesign/season";
import type { CarClass, SeasonalOfferData } from "@/lib/types";

/**
 * «Анатомия детейлинга» на главной (03-template-home.md §4).
 *
 * Инициализация ленивая: до подхода блока к экрану (за вьюпорт) в разметке
 * лежит только стилл первой станции — обычной картинкой, без priority, чтобы
 * не спорить с постером hero за LCP. Данные, карты попаданий и видео-пролёты
 * подтягиваются, когда блок стал близко, а сами переходы — только после
 * первого взаимодействия с ним.
 */
/**
 * Скелет повторяет геометрию смонтированного блока (высоты рядов чипов),
 * чтобы ни ожидание данных, ни загрузка чанка не двигали контент (CLS).
 */
function AnatomySkeleton({ note }: { note?: string }) {
  return (
    <div>
      <div aria-hidden="true" className="mb-4 h-11 border-b border-line" />
      <div>
        <div className="relative aspect-[4/3] w-full min-w-0 overflow-hidden rounded-lg border border-line bg-elevated lg:aspect-[1920/823]">
          <Image
            src={`/anatomy/still_S0.webp?v=${ANATOMY_ASSETS_VERSION}`}
            alt="Автомобиль в студии: интерактивная схема зон детейлинга"
            fill
            sizes="(max-width: 768px) 100vw, 1200px"
            className="object-cover object-[47%_50%] lg:object-center"
          />
          {note && <p className="absolute bottom-3 left-4 text-caption text-ink-secondary">{note}</p>}
        </div>
      </div>
      {/* Место под ряд чипов зон: мобиле — одна лента, десктоп — два ряда */}
      <div aria-hidden="true" className="mt-4 h-11 lg:h-24" />
    </div>
  );
}

const Anatomy = dynamic(() => import("@/components/ds/Anatomy"), {
  ssr: false,
  // Без loading-фолбэка dynamic на ~300мс загрузки чанка рендерит НИЧЕГО —
  // грид схлопывался на 418px и контент прыгал (CLS 0.3×2)
  loading: () => <AnatomySkeleton note="Загружаем схему…" />,
});

interface AnatomySectionProps {
  /** Слаги услуг, на которые ведут зоны, — для передачи выбора в квиз */
  quizAnchor?: string;
  /** Классы авто — подбор автомобиля в смете */
  carClasses?: CarClass[];
  /** Сезонная акция из БД: пресет «зоны риска» подписывается её выгодой */
  season?: SeasonalOfferData | null;
}

export default function AnatomySection({ quizAnchor = "#quiz", carClasses = [], season }: AnatomySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [data, setData] = useState<AnatomyData | null>(null);
  const [indexMap, setIndexMap] = useState<AnatomyIndexMap | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setNear(true);
      },
      // Один вьюпорт запаса: к моменту появления блок уже готов
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near || data) return;
    Promise.all([
      fetch(`/anatomy/anatomy.json?v=${ANATOMY_ASSETS_VERSION}`).then((r) => r.json()),
      fetch(`/anatomy/index_map.json?v=${ANATOMY_ASSETS_VERSION}`).then((r) => r.json()),
    ])
      .then(([a, m]) => {
        // Салон, днище, кузов целиком — зоны без рендера, подмешиваются здесь
        setData(withExtraZones(a as AnatomyData));
        setIndexMap(m as AnatomyIndexMap);
      })
      .catch(() => setFailed(true));
  }, [near, data]);

  const toggle = (zoneId: string) =>
    setSelected((prev) => (prev.includes(zoneId) ? prev.filter((z) => z !== zoneId) : [...prev, zoneId]));
  const selectMany = (ids: string[]) => setSelected((prev) => Array.from(new Set([...prev, ...ids])));

  // Выбранная услуга по зоне (индекс в services); нет записи — первая, главная.
  // Выбор услуги в карточке добавляет зону в смету, если её там ещё нет.
  const [choice, setChoice] = useState<Record<string, number>>({});
  const choose = (zoneId: string, index: number) => {
    setChoice((prev) => ({ ...prev, [zoneId]: index }));
    setSelected((prev) => (prev.includes(zoneId) ? prev : [...prev, zoneId]));
  };

  // Смета → квиз: зоны и, если назван, автомобиль (квиз сам решит, с какого шага)
  const estimate = (pick: CarPick | null) =>
    sendQuizPreset({
      zones: selected,
      carClass: pick?.classLabel,
      carBrand: pick && pick.brand ? `${pick.brand} ${pick.model}` : undefined,
    });

  // Пресет «зоны риска» есть всегда — это понятие рынка PPF; строка акции
  // подписывает его только пока сезон активен
  const live = seasonIsLive(season);
  const preset = {
    label: "Зоны риска",
    zones: [...RISK_ZONES],
    note: live ? `${season.title}: ${seasonBenefit(season)}` : null,
  };

  // Ещё два готовых набора — одним тапом, без разбора схемы (владелец 23.09.2026:
  // «анатомия крутая, но сложная сразу»). Только наборы, где сумма по деталям
  // честна: «кузов целиком» по деталям вышел бы дороже пакета полной оклейки
  // (от 180 000 ₽) и отпугивал бы. «Зимний комплект» продолжает логику защиты
  // от реагентов: зоны риска плюс пороги.
  const extraPresets = [
    { label: "Зимний комплект", zones: [...RISK_ZONES, "rockers"] },
    { label: "Оптика", zones: ["headlights", "taillights"] },
  ];

  // Сводка: выбранные зоны в порядке выбора + сумма по ВЫБРАННОЙ услуге
  // каждой зоны (по умолчанию главной — PPF/бронирование), а не по самой
  // дешёвой: «от 7 000 за комплекс» вводило в заблуждение (владелец 03.09)
  const zoneById = new Map((data?.zones ?? []).map((z) => [z.id, z]));
  const selectedZones = selected
    .map((id) => zoneById.get(id))
    .filter((z): z is NonNullable<typeof z> => Boolean(z));
  const estimateFrom = selectedZones.reduce((sum, z) => {
    const svc = z.services[choice[z.id] ?? 0] ?? z.services[0];
    return sum + (svc?.priceFrom ?? 0);
  }, 0);

  return (
    <section id="anatomy" className="ds-section ds-scene ds-numbered" data-gate-new="интерактивная схема «Анатомия детейлинга» (ТЗ главной §4)">
      <div className="ds-container relative">
        <span aria-hidden="true" className="ds-secnum" />
        <h2 className="font-display text-h2 text-ink">Анатомия детейлинга</h2>
        {/* Инструкция, а не описание: человек сразу понимает, что делать и что
            получит (владелец 23.09.2026: «сложная сразу») */}
        <p className="mt-3 max-w-[56ch] text-body text-ink-secondary">
          Нажмите на деталь машины или возьмите готовый набор — цену покажем сразу
        </p>

        <div ref={ref} className="mt-10">
          {data && indexMap ? (
            <Anatomy
              data={data}
              indexMap={indexMap}
              selected={selected}
              onToggle={toggle}
              onSelectMany={selectMany}
              choice={choice}
              onChoose={choose}
              estimateFrom={estimateFrom}
              onEstimate={estimate}
              carClasses={carClasses}
              preset={preset}
              extraPresets={extraPresets}
            />
          ) : (
            // До инициализации — кадр без priority: LCP главной — постер hero
            <AnatomySkeleton
              note={failed ? "Схема не загрузилась — услуги и цены есть в разделе ниже." : "Загружаем схему…"}
            />
          )}

          {/* Сводка выбора: продающая панель вместо голой строки. Рендерится
              всегда (не зависит от данных схемы) — монтирование Anatomy её
              не двигает; сумма — минимумы услуг по выбранным зонам. */}
          {/* От 1280 подсказка живёт в правой колонке самой схемы */}
          <div className={`mt-6 border-t border-line pt-5${selectedZones.length > 0 ? " lg:hidden" : " xl:hidden"}`}>
            {selectedZones.length > 0 ? (
              // Мобайл и планшет; на десктопе та же смета живёт в панели внутри кадра
              <AnatomyEstimate
                className="rounded-lg border border-line bg-surface p-5 lg:hidden"
                zones={selectedZones}
                choice={choice}
                estimateFrom={estimateFrom}
                carClasses={carClasses}
                onRemove={toggle}
                onEstimate={estimate}
                seasonNote={preset.zones.every((z) => selected.includes(z)) ? preset.note : null}
              />
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <p className="text-body-sm text-ink-secondary">
                  Отмечайте зоны на машине — соберём предварительный расчёт
                </p>
                <a href={quizAnchor} className="ds-focus rounded-sm text-body-sm text-ink-secondary underline decoration-line-strong underline-offset-4 hover:text-accent">
                  или посчитать без выбора зон
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
