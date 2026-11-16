"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Счётчик цифр-фактов (1200+ авто) — прокручивается один раз при появлении (ДС §5).
 * Значение сразу финальное при prefers-reduced-motion: анимация чисел там мешает читать.
 *
 * В SSR-разметке лежит финальное число, а не 0: цифры — индексируемый контент
 * (правило 1:1), и без JS страница обязана показывать правду. Обнуляет счётчик
 * только сам браузер — в момент, когда блок доехал до экрана и анимация пошла.
 */
interface CountUpProps {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}

export default function CountUp({ value, duration = 1000, suffix = "", className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        // Проверку выносим в колбэк: setState прямо в теле эффекта даёт каскад рендеров
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setShown(value);
          return;
        }
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration);
          // easeOutQuad: быстрый старт и мягкая остановка на финальном числе
          setShown(Math.round(value * (1 - (1 - p) * (1 - p))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  // Одной строкой и без разделителя тысяч: в исходном контенте «1200+», а два
  // JSX-выражения подряд SSR разделяет комментарием — текст рвётся на «1200» и «+»
  return (
    <span ref={ref} className={className}>
      {`${shown}${suffix}`}
    </span>
  );
}
