import Reveal from "./Reveal";

/**
 * «Как мы работаем» — таймлайн этапов (03-template-service.md §1.5).
 * Колонок столько же, сколько шагов (3–5). На мобайле — вертикальный список.
 */
interface ProcessTimelineProps {
  steps: { title: string; description: string }[];
}

const COLS: Record<number, string> = {
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
};

export default function ProcessTimeline({ steps }: ProcessTimelineProps) {
  if (steps.length === 0) return null;

  return (
    <div className={`grid gap-8 ${COLS[steps.length] ?? "md:grid-cols-3"}`}>
      {steps.map((step, i) => (
        <Reveal key={step.title} delay={i * 80}>
          <div className="ds-nums flex items-center gap-3">
            <span className="text-caption font-semibold text-accent">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
          </div>
          <h3 className="mt-4 font-display text-h4 text-ink">{step.title}</h3>
          <p className="mt-2 text-body-sm text-ink-secondary">{step.description}</p>
        </Reveal>
      ))}
    </div>
  );
}
