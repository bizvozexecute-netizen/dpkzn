"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Появление секции при скролле — единственная анимация входа на сайте (ДС §5).
 *
 * IntersectionObserver вместо scroll-листенера: обработчик скролла на 80% мобильного
 * трафика съедает main thread ровно в окне LCP. Срабатывает один раз и отписывается.
 * При prefers-reduced-motion CSS сразу показывает контент (см. tokens.css).
 */
interface RevealProps {
  as?: ElementType;
  /** Задержка ступеньки внутри группы, мс (ДС: stagger 80ms) */
  delay?: number;
  /** Хореография: up — подъём (дефолт), line — «из-под линии» для заголовков,
   *  scale — лёгкое приближение для фото */
  variant?: "up" | "line" | "scale";
  className?: string;
  children: ReactNode;
}

export default function Reveal({ as: Tag = "div", delay = 0, variant = "up", className, children }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.revealed = "true";
        io.disconnect();
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={cn("ds-reveal", variant !== "up" && `ds-reveal--${variant}`, className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {variant === "line" ? <span className="ds-reveal-line-inner">{children}</span> : children}
    </Tag>
  );
}
