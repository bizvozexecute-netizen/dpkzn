"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, X } from "./icons";

/**
 * Сетка фото кейса с лайтбоксом на <dialog> (03-template-portfolio.md §4).
 *
 * Никаких библиотек: нативный диалог даёт фокус-ловушку и Esc бесплатно,
 * остаются только стрелки — клавиатурные и экранные. В лайтбоксе обычный
 * <img>: файл уже загружен превьюшкой, оптимизатор здесь не нужен.
 */
interface GalleryLightboxProps {
  images: string[];
  alt: string;
}

export default function GalleryLightbox({ images, alt }: GalleryLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);

  const show = (index: number) => {
    setCurrent(index);
    setOpen(true);
    dialogRef.current?.showModal();
  };

  const step = useCallback(
    (delta: number) => setCurrent((c) => (c + delta + images.length) % images.length),
    [images.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => show(i)}
            aria-label={`${alt} — фото ${i + 1}, открыть крупно`}
            className="ds-focus group relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-elevated"
          >
            <Image
              src={src}
              alt={`${alt} — фото ${i + 1}`}
              fill
              // Первое фото — LCP страницы галереи
              priority={i === 0}
              sizes="(max-width: 768px) 50vw, 400px"
              className="object-cover transition-transform duration-400 ease-out md:group-hover:scale-[1.06]"
            />
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Клик по подложке (сам dialog) закрывает, клик по контенту — нет
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="m-auto w-[min(96vw,1200px)] bg-transparent p-0 backdrop:bg-[rgba(6,6,8,0.9)]"
      >
        {open && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[current]}
              alt={`${alt} — фото ${current + 1} из ${images.length}`}
              className="max-h-[86vh] w-full rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Закрыть галерею"
              className="ds-focus absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-pill border border-line bg-[rgba(10,10,12,0.7)] text-ink backdrop-blur-[8px]"
            >
              <X size={18} />
            </button>
            {images.length > 1 && (
              <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Предыдущее фото"
                  className="ds-focus flex h-11 w-11 items-center justify-center rounded-pill border border-line bg-[rgba(10,10,12,0.7)] text-ink backdrop-blur-[8px]"
                >
                  <ArrowLeft size={18} />
                </button>
                <span className="ds-nums text-caption text-ink-secondary">
                  {current + 1} / {images.length}
                </span>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Следующее фото"
                  className="ds-focus flex h-11 w-11 items-center justify-center rounded-pill border border-line bg-[rgba(10,10,12,0.7)] text-ink backdrop-blur-[8px]"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
