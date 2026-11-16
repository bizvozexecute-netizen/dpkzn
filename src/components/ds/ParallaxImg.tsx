"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Мягкий параллакс фото разворота (03-template-portfolio.md §4):
 * translateY ≤ 6%, только desktop, IO + rAF — слушатель скролла живёт лишь
 * пока блок в кадре. На мобильных и при reduced-motion — обычная картинка.
 *
 * Внутренний слой выше кадра на 16%, поэтому сдвиг ±3% не оголяет края —
 * и не нужен scale, который мылит фото на ретине.
 */
export default function ParallaxImg({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const inner = innerRef.current;
    if (!el || !inner) return;
    if (window.innerWidth < 1024 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      // Положение центра блока в вьюпорте: -1 (низ экрана) … 1 (верх экрана)
      const progress = 1 - (2 * (rect.top + rect.height / 2)) / window.innerHeight;
      inner.style.transform = `translateY(${(Math.max(-1, Math.min(1, progress)) * 3).toFixed(2)}%)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        update();
        window.addEventListener("scroll", onScroll, { passive: true });
      } else {
        window.removeEventListener("scroll", onScroll);
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={cn("absolute inset-0 overflow-hidden", className)}>
      <div ref={innerRef} className="absolute inset-x-0 -inset-y-[8%] will-change-transform">
        {children}
      </div>
    </div>
  );
}
