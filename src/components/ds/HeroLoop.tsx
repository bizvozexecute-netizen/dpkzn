"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Видео-луп поверх постера hero.
 *
 * Десктоп: монтируется после события load и кроет hero целиком.
 *
 * Телефон: hero здесь 390×996 — соотношение 0.39, а кадр 16:9 — 1.79. Кадром
 * на весь hero от него оставалась узкая центральная полоса, и объект (у лупа
 * главной — полировальник в левой трети) уезжал за край: «видео почти не
 * видно, оно в краях» (владелец 03.09). Поэтому на телефоне у видео свой слой
 * в верхней части hero с соотношением самого кадра — оно помещается целиком —
 * и мобильный ре-кадр (loop-N-m) с объектом по центру; низ слоя растворяется
 * маской в постер, поэтому стыка не видно. Монтируется по первому жесту:
 * до него LCP остаётся постером (перф-гейт мобильной выдачи).
 *
 * Не включается при reduced-motion, Save-Data и на медленной сети — там
 * остаётся постер, и это законченное состояние, а не деградация.
 */
interface HeroLoopProps {
  /** Путь без расширения: подставляются .webm и .mp4 */
  src: string;
  /** Есть мобильный ре-кадр `${src}-m.{webm,mp4}` (см. scripts/encode-hero-mobile.mjs) */
  mobileVariant?: boolean;
}

export default function HeroLoop({ src, mobileVariant = true }: HeroLoopProps) {
  /** null — видео ещё не подключено; иначе выбранный слой */
  const [mode, setMode] = useState<null | "desktop" | "mobile">(null);
  const [playing, setPlaying] = useState(false);
  const heroMarker = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    type NetInfo = { saveData?: boolean; effectiveType?: string };
    const conn = (navigator as Navigator & { connection?: NetInfo }).connection;
    if (conn?.saveData) return;
    if (conn?.effectiveType && ["slow-2g", "2g", "3g"].includes(conn.effectiveType)) return;

    // Десктоп с мышью: видео стартует сразу после загрузки страницы (постер к
    // этому моменту отрисован, LCP зафиксирован) — владелец 02.09: «почему
    // видео не запускается сразу».
    const desktop = window.matchMedia("(min-width: 1024px) and (hover: hover)").matches;
    if (desktop) {
      const go = () => setMode("desktop");
      if (document.readyState === "complete") {
        const id = window.setTimeout(go, 250);
        return () => window.clearTimeout(id);
      }
      window.addEventListener("load", go, { once: true });
      return () => window.removeEventListener("load", go);
    }

    // Decorative media can wait until scrolling has settled. A tap on a
    // navigation or quote control should only run that control's handler.
    let timer: number;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (heroMarker.current && heroMarker.current.getBoundingClientRect().bottom > 0) {
          window.removeEventListener("scroll", onScroll);
          setMode("mobile");
        }
      }, 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (!mode) return <span ref={heroMarker} aria-hidden="true" className="pointer-events-none absolute inset-0" />;

  // Мобильный ре-кадр: тот же клип, кроп под вертикальный экран. Исходный
  // клип остаётся в списке источников следом: если ре-кадра нет, браузер
  // сам перейдёт к нему, и видео всё равно покажется.
  const sources = mode === "mobile" && mobileVariant ? [`${src}-m`, src] : [src];

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      onPlaying={() => setPlaying(true)}
      className={`ds-hero-video transition-opacity duration-slow ${playing ? "opacity-100" : "opacity-0"}`}
    >
      {sources.map((s) => (
        <source key={s} src={`${s}.webm`} type="video/webm" />
      ))}
      {sources.map((s) => (
        <source key={`${s}.mp4`} src={`${s}.mp4`} type="video/mp4" />
      ))}
    </video>
  );
}
