"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MoveHorizontal } from "./icons";
import { cn } from "@/lib/utils";

/**
 * Слайдер «до / после» (ДС §4.5).
 *
 * Обе картинки грузятся обычной ленивой загрузкой — она срабатывает, когда блок
 * подходит к экрану, задолго до того как до ручки дотянется палец. Раньше здесь
 * стоял priority, и две картинки по 16 КБ соревновались с постером hero за
 * приоритет в очереди запросов, отодвигая LCP.
 *
 * При появлении в вьюпорте ручка один раз проезжает 50 → 62 → 50 % — без этой
 * подсказки большинство просто не понимает, что блок интерактивный.
 */
interface BeforeAfterProps {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  alt?: string;
  className?: string;
}

export default function BeforeAfter({
  before,
  after,
  beforeLabel = "До",
  afterLabel = "После",
  alt = "",
  className,
}: BeforeAfterProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const hinted = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, next)));
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hinted.current) return;
        hinted.current = true;
        io.disconnect();

        const DURATION = 800;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / DURATION);
          // Туда-обратно одной синусоидой: 50 → 62 → 50
          setPosition(50 + 12 * Math.sin(p * Math.PI));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative aspect-[4/3] w-full cursor-ew-resize overflow-hidden rounded-lg border border-line select-none md:aspect-[16/10]",
        className,
      )}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        setFromClientX(e.clientX);
      }}
      onPointerMove={(e) => dragging && setFromClientX(e.clientX)}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        setDragging(false);
      }}
      onPointerCancel={() => setDragging(false)}
    >
      <Image src={after} alt={alt} fill sizes="(max-width: 768px) 100vw, 1200px" className="object-cover" />

      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <Image src={before} alt="" fill sizes="(max-width: 768px) 100vw, 1200px" className="object-cover" />
      </div>

      <span className="pointer-events-none absolute left-4 top-4 rounded-sm bg-[rgba(10,10,12,0.8)] px-2 py-1 text-overline uppercase text-ink">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute right-4 top-4 rounded-sm bg-[rgba(10,10,12,0.8)] px-2 py-1 text-overline uppercase text-ink">
        {afterLabel}
      </span>

      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${position}%` }} />

      <button
        type="button"
        role="slider"
        aria-label="Сравнение до и после"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 2));
          if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 2));
        }}
        className={cn(
          "ds-focus absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-pill border border-line-strong bg-elevated text-ink",
          dragging && "shadow-glow-accent",
        )}
        style={{ left: `${position}%` }}
      >
        <MoveHorizontal size={18} />
      </button>
    </div>
  );
}
