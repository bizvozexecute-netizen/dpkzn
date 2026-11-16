"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowRight } from "@/components/ds/icons";
import type { ServiceGridItem } from "./ServicesGridSection";

/**
 * Услуги строками (решение владельца 02.09: сетка 4×2 «смотрится убого»).
 * Awwwards-паттерн: крупные типографические строки с номером и ценой; на
 * десктопе при наведении фото-превью следует за курсором. Все 19 ссылок
 * всегда в DOM — это главный узел внутренней перелинковки, раскрывашка
 * больше не нужна.
 *
 * Появление по строкам убрано: при прыжке по якорю или быстрой прокрутке
 * IntersectionObserver не успевал, и строки 07–19 оставались невидимыми
 * (аудит 02.09). Секция раскрывается целиком заголовком.
 *
 * Перф: превью — обычный <img>, грузится лениво при первом наведении
 * строки (new Image в кеш браузера), позиционируется transform'ом через
 * ref без setState на каждое движение; в LCP не участвует.
 */
export default function ServicesRows({ items }: { items: ServiceGridItem[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const warmed = useRef<Set<string>>(new Set());

  function warm(src: string) {
    if (warmed.current.has(src)) return;
    warmed.current.add(src);
    // next/image затеняет глобальный конструктор — берём его с window
    new window.Image().src = src;
  }

  function onMove(e: React.PointerEvent) {
    const preview = previewRef.current;
    const list = listRef.current;
    if (!preview || !list) return;
    const rect = list.getBoundingClientRect();
    preview.style.transform = `translate(${e.clientX - rect.left + 28}px, ${e.clientY - rect.top - 90}px)`;
  }

  const active = items.find((i) => i.slug === hovered);

  return (
    <div ref={listRef} className="relative" onPointerMove={onMove}>
      <ul>
        {items.map((item, i) => (
          <li key={item.slug} className="border-t border-line last:border-b">
            <Link
              href={item.href}
              onPointerEnter={() => {
                warm(item.image);
                setHovered(item.slug);
              }}
              onPointerLeave={() => setHovered((h) => (h === item.slug ? null : h))}
              className="ds-focus group flex items-center gap-4 py-4 transition-colors duration-150 md:gap-8 md:py-5"
            >
              <span className="ds-nums w-8 flex-shrink-0 text-caption text-ink-tertiary">
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Мини-фото — только мобайл/планшет: на десктопе живёт превью у курсора */}
              <span className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-line lg:hidden">
                <Image src={item.image} alt="" fill sizes="48px" className="object-cover" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block font-display text-body-lg font-medium text-ink transition-colors duration-150 md:text-h3">
                  {item.title}
                </span>
                <span className="mt-0.5 hidden text-body-sm text-ink-secondary md:block">
                  {item.tagline}
                </span>
                {/* Мобилка: цена под названием — справа ей не хватает места */}
                {item.priceFrom && (
                  <span className="ds-nums mt-0.5 block text-caption text-ink-secondary md:hidden">
                    {item.priceFrom}
                  </span>
                )}
              </span>

              {item.priceFrom && (
                <span className="ds-nums hidden flex-shrink-0 text-body text-ink-secondary md:block">
                  {item.priceFrom}
                </span>
              )}
              {/* Текст CTA прежних карточек: имя для иконки-стрелки и гейт 1:1 */}
              <span className="sr-only">Подробнее</span>
              <ArrowRight
                size={20}
                className="flex-shrink-0 text-ink-tertiary transition-transform duration-250 md:group-hover:translate-x-1 md:group-hover:text-ink"
              />
            </Link>
          </li>
        ))}
      </ul>

      {/* Превью у курсора (десктоп): transform из onPointerMove, только opacity
          на появление — макет не трогается */}
      <div
        ref={previewRef}
        aria-hidden="true"
        className={`pointer-events-none absolute left-0 top-0 z-10 hidden w-[360px] overflow-hidden rounded-lg border border-line shadow-card lg:block ${
          active ? "opacity-100" : "opacity-0"
        } transition-opacity duration-200`}
      >
        {active && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={active.image} alt="" className="aspect-video w-full object-cover" />
        )}
      </div>
    </div>
  );
}
