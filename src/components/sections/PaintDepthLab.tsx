"use client";

import { useState } from "react";
import { Check, Minus, X, Ruler } from "lucide-react";
import { reachGoal } from "@/lib/analytics";

/*
 * PaintDepthLab — фирменный блок страницы /polirovka.
 * Интерактивный разрез ЛКП: ползунок глубины съёма в микронах показывает,
 * какие дефекты уходят при полировке и какой запас лака остаётся.
 * Верхние 10 мкм лака показаны крупно (зона полировки), остальные слои — сжато.
 */

const CLEAR_COAT_TOTAL = 50; // средняя толщина слоя лака, мкм
const ZOOM_ZONE = 10; // видимая «увеличенная» зона полировки, мкм
const MAX_CUT = 4; // максимальный безопасный съём на ползунке, мкм

const DEFECTS = [
  { name: "Голограммы и матовость", depth: 0.5, label: "~0,5 мкм" },
  { name: "Паутинка от моек", depth: 1.5, label: "1–2 мкм" },
  { name: "Царапины от веток и щёток", depth: 2.5, label: "2–3 мкм" },
  { name: "Глубокие риски до грунта", depth: 5.5, label: "5+ мкм" },
] as const;

const mkm = (n: number) => n.toFixed(1).replace(".", ",");

export default function PaintDepthLab() {
  const [cut, setCut] = useState(2);
  const [touched, setTouched] = useState(false);

  function handleChange(value: number) {
    setCut(value);
    if (!touched) {
      setTouched(true);
      reachGoal("paint_lab_interact");
    }
  }

  // позиция линии среза внутри увеличенной зоны (в % высоты зоны)
  const cutPct = (cut / ZOOM_ZONE) * 100;

  return (
    <section className="section-padding section-spotlight">
      <div className="container-main">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-text">
            Сколько лака снимает полировка?
          </h2>
          <p className="mt-3 text-text-secondary max-w-xl mx-auto">
            Главный страх — «полировка сотрёт лак». Двигайте ползунок: покажем честно,
            в микронах, что уходит и какой запас остаётся.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start max-w-5xl mx-auto">
          {/* ── Разрез ЛКП ── */}
          <div className="card p-5 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Разрез ЛКП
              </span>
              <span className="text-xs text-text-secondary">зона полировки, увеличено ×20</span>
            </div>

            {/* Увеличенная зона: верхние 10 мкм лака */}
            <div className="relative h-[220px] rounded-t-[8px] overflow-hidden border border-border border-b-0">
              {/* фон лака с золотым отливом */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#2E2A20] via-[#252118] to-[#1E1B14]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(212,184,48,0.14),transparent_60%)]" />

              {/* снятый слой */}
              <div
                className="absolute left-0 right-0 top-0 bg-[repeating-linear-gradient(-45deg,rgba(212,184,48,0.16)_0_6px,transparent_6px_12px)] border-b-2 border-dashed border-accent-gold transition-[height] duration-300"
                style={{ height: `${cutPct}%` }}
                aria-hidden
              />

              {/* дефекты на своих глубинах */}
              {DEFECTS.map((d) => {
                const gone = cut >= d.depth;
                const top = Math.min((d.depth / ZOOM_ZONE) * 100, 94);
                return (
                  <div
                    key={d.name}
                    className="absolute left-0 right-0 flex items-center gap-2 px-3 transition-opacity duration-300"
                    style={{ top: `${top}%`, opacity: gone ? 0.15 : 1 }}
                  >
                    <span className="h-[2px] w-8 md:w-12 bg-text-secondary/70 rounded-full [transform:rotate(-2deg)]" />
                    <span className="text-[11px] md:text-xs text-text-secondary whitespace-nowrap">
                      {d.name.split(" ")[0].toLowerCase()} · {d.label}
                    </span>
                  </div>
                );
              })}

              {/* отметка глубины среза */}
              <div
                className="absolute right-2 -translate-y-1/2 text-[11px] font-bold text-accent-gold transition-[top] duration-300"
                style={{ top: `${cutPct}%` }}
              >
                −{mkm(cut)} мкм
              </div>
            </div>

            {/* Сжатые нижние слои */}
            <div className="rounded-b-[8px] overflow-hidden border border-border border-t-0 text-[11px] md:text-xs">
              <div className="px-3 py-2 bg-[#1E1B14] text-text-secondary flex justify-between">
                <span>Лак — ещё ~{CLEAR_COAT_TOTAL - ZOOM_ZONE} мкм</span>
                <span className="text-accent-gold font-semibold">запас {mkm(CLEAR_COAT_TOTAL - cut)} мкм</span>
              </div>
              <div className="px-3 py-1.5 bg-[#3A2F35] text-text-secondary">База — цвет, 15–20 мкм</div>
              <div className="px-3 py-1.5 bg-[#2B2B31] text-text-secondary">Грунт, 30–40 мкм</div>
              <div className="px-3 py-1.5 bg-[#3C3C40] text-text">Металл кузова</div>
            </div>

            {/* Ползунок */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="paint-cut" className="text-sm font-semibold text-text">
                  Глубина съёма
                </label>
                <span className="text-sm font-bold text-accent-gold tabular-nums">
                  {mkm(cut)} мкм
                </span>
              </div>
              <input
                id="paint-cut"
                type="range"
                min={0}
                max={MAX_CUT}
                step={0.5}
                value={cut}
                onChange={(e) => handleChange(Number(e.target.value))}
                className="paint-lab-range w-full"
                aria-valuetext={`${mkm(cut)} микрона`}
              />
              <div className="flex justify-between text-[11px] text-text-secondary mt-1">
                <span>0 — только защита</span>
                <span>{MAX_CUT} мкм — предел за одну полировку</span>
              </div>
            </div>
          </div>

          {/* ── Что уходит + факты ── */}
          <div>
            <ul className="space-y-2.5">
              {DEFECTS.map((d) => {
                const deep = d.depth > MAX_CUT;
                const gone = cut >= d.depth;
                return (
                  <li
                    key={d.name}
                    className="card px-4 py-3 flex items-center gap-3"
                  >
                    <span
                      className={
                        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors " +
                        (deep
                          ? "bg-accent-red/15 text-accent-red"
                          : gone
                            ? "bg-accent-gold/15 text-accent-gold"
                            : "bg-bg-hover text-text-secondary")
                      }
                    >
                      {deep ? <X size={15} /> : gone ? <Check size={15} /> : <Minus size={15} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text">{d.name}</p>
                      <p className="text-xs text-text-secondary">
                        {deep
                          ? "Полировкой не выводятся — честно скажем на диагностике"
                          : gone
                            ? `Уйдут при съёме ${d.label}`
                            : `Останутся — нужно минимум ${d.label}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="card mt-4 p-4 flex items-start gap-3 border-accent-gold/30">
              <span className="w-9 h-9 rounded-full bg-accent-gold/10 flex items-center justify-center flex-shrink-0">
                <Ruler size={18} className="text-accent-gold" />
              </span>
              <p className="text-sm text-text-secondary">
                Средний съём за восстановительную полировку — <b className="text-text">2–3 мкм из ~50 мкм лака</b>.
                Перед работой замеряем толщину в 30+ точках толщиномером, после — показываем
                контрольный замер. Если лак тонкий — скажем до начала работ, а не после.
              </p>
            </div>

            <a
              href="#cta-form"
              className="btn-cta w-full md:w-auto mt-5 inline-flex items-center justify-center px-6"
            >
              Проверить свой лак бесплатно
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
