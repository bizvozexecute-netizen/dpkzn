"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Курсор-колесо (владелец 03.09: «точка пиксельная, у нас же детейлинг»).
 *
 * Литой диск, который катится вслед за указателем: угол поворота растёт
 * с пройденным путём, направление — по горизонтали движения, как у колеса
 * на дороге. Над интерактивами диск крупнее (спицы остаются: «кольцо
 * с точкой» владелец прочитал как сбой), над полями ввода прячется —
 * там работает системный текстовый курсор. На быстром движении из-под
 * колеса идёт дым: мягкие клубы на отдельном канвасе, сносятся против
 * хода и тают за полсекунды (владелец 03.09: «дым не идёт»).
 *
 * SVG, а не растр: острый при любом масштабе (точка растягивалась в 2.5×
 * и мылилась). Перф: один passive pointermove, позиция и угол пишутся
 * transform'ом в rAF без setState; канвас дыма рисуется только пока живы
 * клубы (≤ 40 штук). Нужен точный указатель с hover; при
 * prefers-reduced-motion диск остаётся, но не катится, не догоняет и не дымит.
 */

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  born: number;
  life: number;
}

/** Скорость указателя (px/мс), с которой колесо начинает дымить */
const SMOKE_SPEED = 0.6;
/** Путь между клубами при дыме, px */
const SMOKE_STEP = 14;
const SMOKE_MAX = 64;

export default function CursorWheel() {
  const ref = useRef<HTMLDivElement>(null);
  const rimRef = useRef<SVGGElement>(null);
  const smokeRef = useRef<HTMLCanvasElement>(null);
  const [armed, setArmed] = useState(false);

  // Косметика армируется в idle — не стоит в очереди гидрации с квизом
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine) and (hover: hover)").matches) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const hasIdle = typeof w.requestIdleCallback === "function";
    const id = hasIdle ? w.requestIdleCallback!(() => setArmed(true)) : window.setTimeout(() => setArmed(true), 350);
    return () => {
      if (hasIdle) w.cancelIdleCallback?.(id);
      else window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (!armed) return;
    const el = ref.current;
    const rim = rimRef.current;
    const smoke = smokeRef.current;
    if (!el || !rim || !smoke) return;
    if (!window.matchMedia("(pointer: fine) and (hover: hover)").matches) return;
    // При «уменьшить анимацию» колесо остаётся, но перестаёт катиться,
    // догонять и дымить: диск жёстко привязан к указателю
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = document.documentElement;
    root.classList.add("ds-cursor-on");

    const sctx = smoke.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const fit = () => {
      smoke.width = Math.round(window.innerWidth * dpr);
      smoke.height = Math.round(window.innerHeight * dpr);
    };
    fit();
    window.addEventListener("resize", fit);

    let x = -100, y = -100, cx = -100, cy = -100;
    let angle = 0, targetAngle = 0;
    let scale = 1, cur = 1;
    let shown = false, hidden = false;
    let raf = 0;
    let lastT = 0, lastX = 0, lastY = 0, sinceSmoke = 0;
    const puffs: Puff[] = [];

    const drawSmoke = (now: number) => {
      if (!sctx) return false;
      sctx.clearRect(0, 0, smoke.width, smoke.height);
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        const k = (now - p.born) / p.life;
        if (k >= 1) {
          puffs.splice(i, 1);
          continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy = p.vy * 0.94 - 0.03; // клуб слегка всплывает
        const r = (p.r + k * 26) * dpr;
        const a = 0.42 * (1 - k) * (1 - k);
        const g = sctx.createRadialGradient(p.x * dpr, p.y * dpr, 0, p.x * dpr, p.y * dpr, r);
        g.addColorStop(0, `rgba(235, 232, 226, ${a})`);
        g.addColorStop(1, "rgba(235, 232, 226, 0)");
        sctx.fillStyle = g;
        sctx.beginPath();
        sctx.arc(p.x * dpr, p.y * dpr, r, 0, Math.PI * 2);
        sctx.fill();
      }
      return puffs.length > 0;
    };

    const tick = (now: number) => {
      const k = calm ? 1 : 0.35;
      cx += (x - cx) * k;
      cy += (y - cy) * k;
      cur += (scale - cur) * (calm ? 1 : 0.2);
      angle += (targetAngle - angle) * (calm ? 0 : 0.18);
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0) scale(${cur.toFixed(3)})`;
      rim.style.transform = `rotate(${angle.toFixed(1)}deg)`;
      const smoking = drawSmoke(now);
      const busy =
        smoking || Math.abs(x - cx) + Math.abs(y - cy) > 0.3 || Math.abs(scale - cur) > 0.01 || Math.abs(targetAngle - angle) > 0.5;
      raf = busy ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      const dx = e.clientX - x;
      const dy = e.clientY - y;
      const dist = Math.hypot(dx, dy);
      if (shown && !calm) {
        // Колесо катится: угол пропорционален пути, знак — по горизонтали
        targetAngle += (dx < 0 ? -1 : 1) * dist * 1.6;
        // Дым — только на быстром ходу, клуб на каждые SMOKE_STEP px пути,
        // рождается под колесом и сносится против движения
        const dt = Math.max(1, now - lastT);
        const speed = Math.hypot(e.clientX - lastX, e.clientY - lastY) / dt;
        sinceSmoke += dist;
        if (speed > SMOKE_SPEED && sinceSmoke >= SMOKE_STEP && !hidden) {
          sinceSmoke = 0;
          const n = Math.max(1, Math.min(4, Math.round(speed * 1.5)));
          for (let i = 0; i < n && puffs.length < SMOKE_MAX; i++) {
            const jitter = (Math.random() - 0.5) * 6;
            // Клуб рождается под НАРИСОВАННЫМ колесом (cx, cy), а не под
            // указателем: диск догоняет мышь с запозданием, и на быстром
            // ходу дым от указателя оказывался впереди колеса
            puffs.push({
              x: cx - (dx / dist) * 6 + jitter,
              y: cy + 6 - (dy / dist) * 6 + jitter,
              vx: (-dx / dist) * 1.2 + (Math.random() - 0.5) * 0.6,
              vy: (-dy / dist) * 1.2 - 0.2,
              r: 8 + Math.random() * 6,
              born: now,
              life: 600 + Math.random() * 300,
            });
          }
        }
      }
      lastT = now;
      lastX = e.clientX;
      lastY = e.clientY;
      x = e.clientX;
      y = e.clientY;
      if (!shown) { shown = true; cx = x; cy = y; }
      const t = e.target as Element | null;
      const interactive = Boolean(t?.closest("a, button, [role='button'], summary, label, [role='option']"));
      const field = Boolean(t?.closest("input, textarea, select"));
      const viewer = Boolean(t?.closest(".ds-anatomy-crop"));
      scale = interactive ? 1.45 : viewer ? 1.25 : 1;
      // Над полем ввода колесо уступает системному текстовому курсору
      hidden = field;
      el.style.opacity = hidden ? "0" : "1";
      kick();
    };
    const onLeave = () => { shown = false; el.style.opacity = "0"; };
    const onDown = () => { scale *= 0.85; kick(); };
    const onUp = () => { scale /= 0.85; kick(); };

    // Фаза захвата: React-обработчики со stopPropagation (панель анатомии
    // глушит pointer-события, чтобы скролл не крутил машину) не дают
    // событию всплыть до window — колесо замирало на краю панели
    // (владелец 03.09: «курсор не заезжает на анатомию»)
    const cap: AddEventListenerOptions = { passive: true, capture: true };
    window.addEventListener("pointermove", onMove, cap);
    window.addEventListener("pointerdown", onDown, cap);
    window.addEventListener("pointerup", onUp, cap);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      root.classList.remove("ds-cursor-on");
      window.removeEventListener("resize", fit);
      window.removeEventListener("pointermove", onMove, cap);
      window.removeEventListener("pointerdown", onDown, cap);
      window.removeEventListener("pointerup", onUp, cap);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [armed]);

  if (!armed) return null;

  return (
    <>
      <canvas ref={smokeRef} aria-hidden="true" className="ds-cursor-smoke" />
      <div ref={ref} aria-hidden="true" className="ds-cursor">
        <svg width="28" height="28" viewBox="-14 -14 28 28" fill="none">
          {/* Обод и спицы вращаются; хаб и прицел — нет */}
          <g ref={rimRef} className="ds-cursor-rim">
            <circle r="12" stroke="currentColor" strokeWidth="1.5" />
            <circle r="9" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
            {[0, 72, 144, 216, 288].map((a) => (
              <line
                key={a}
                x1="0"
                y1="-3"
                x2="0"
                y2="-9.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                transform={`rotate(${a})`}
              />
            ))}
          </g>
          <circle r="2.6" fill="currentColor" className="ds-cursor-hub" />
          <circle r="1" fill="var(--color-bg)" />
        </svg>
      </div>
    </>
  );
}
