"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "./icons";
import type { AnatomyData, AnatomyIndexMap } from "./Anatomy";
import Anatomy from "./Anatomy";
import Button from "./Button";

/**
 * Оверлей «Анатомии» в шаге зон квиза (03-template-service.md §4).
 *
 * Данные и ассеты подтягиваются только при первом открытии: 15 зон, карты
 * попаданий и стиллы не должны висеть в бюджете страницы услуги ради кнопки,
 * которую нажмёт меньшинство.
 *
 * Выбор зон общий с квизом — одно состояние, две проекции (спека §5).
 *
 * Рисуем через портал в body: контейнер шага квиза анимируется трансформом,
 * а любой transform у предка превращает position: fixed в absolute — без
 * портала оверлей схлопывался до ширины формы.
 */
interface AnatomyOverlayProps {
  selected: string[];
  onToggle: (zoneId: string) => void;
}

export default function AnatomyOverlay({ selected, onToggle }: AnatomyOverlayProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<AnatomyData | null>(null);
  const [indexMap, setIndexMap] = useState<AnatomyIndexMap | null>(null);
  const [failed, setFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || data) return;
    Promise.all([
      fetch("/anatomy/anatomy.json").then((r) => r.json()),
      fetch("/anatomy/index_map.json").then((r) => r.json()),
    ])
      .then(([a, m]) => {
        setData(a as AnatomyData);
        setIndexMap(m as AnatomyIndexMap);
      })
      .catch(() => setFailed(true));
  }, [open, data]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const dialog = (
    <div
          role="dialog"
          aria-modal="true"
          aria-label="Анатомия детейлинга: выбор зон на автомобиле"
          className="fixed inset-0 z-80 flex items-center justify-center bg-[rgba(10,10,12,0.8)] p-4 backdrop-blur-[16px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-full w-full max-w-6xl overflow-y-auto rounded-xl border border-line bg-bg p-5 md:p-8">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-overline uppercase text-ink-secondary">Интерактивная схема</p>
                <h2 className="mt-2 font-display text-h3 text-ink">Анатомия детейлинга</h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                aria-label="Закрыть"
                onClick={() => setOpen(false)}
                className="ds-focus flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-pill border border-line text-ink"
              >
                <X size={20} />
              </button>
            </div>

            {data && indexMap ? (
              <Anatomy data={data} indexMap={indexMap} selected={selected} onToggle={onToggle} />
            ) : (
              <p className="py-16 text-center text-body-sm text-ink-secondary">
                {failed ? "Схема не загрузилась — выберите зоны списком в расчёте." : "Загружаем схему…"}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
              <p className="ds-nums text-body-sm text-ink-secondary">
                Выбрано зон: <span className="font-semibold text-ink">{selected.length}</span>
              </p>
              <Button size="sm" onClick={() => setOpen(false)}>
                В расчёт
              </Button>
            </div>
      </div>
    </div>
  );

  return (
    <>
      <Button variant="secondary" size="sm" fullWidth onClick={() => setOpen(true)}>
        Показать на машине
      </Button>
      {open && typeof document !== "undefined" && createPortal(dialog, document.body)}
    </>
  );
}
