import { ChevronDown } from "./icons";
import { cn } from "@/lib/utils";

/**
 * FAQ-аккордеон на нативных details/summary (ДС §1.7 шаблона услуги).
 *
 * Никакого JS и никакого скрытия через display: ответы всегда в разметке —
 * это SEO-актив (FAQPage) и первый экран выдачи по «сколько стоит …».
 * Первый вопрос открыт: он всегда коммерческий и отвечает на главный вопрос визита.
 */
interface FaqProps {
  items: { question: string; answer: string }[];
  className?: string;
}

export default function Faq({ items, className }: FaqProps) {
  if (items.length === 0) return null;

  return (
    <div className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((item, i) => (
        <details key={item.question} open={i === 0} className="group">
          <summary className="ds-focus flex cursor-pointer list-none items-center gap-4 py-5 text-body font-medium text-ink marker:hidden">
            <span className="ds-nums flex-shrink-0 text-caption text-ink-secondary">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1">{item.question}</span>
            <ChevronDown
              size={20}
              className="flex-shrink-0 text-ink-tertiary transition-transform duration-250 group-open:rotate-180"
            />
          </summary>
          <div className="pb-5 pl-9 text-body-sm text-ink-secondary">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}
