import Link from "next/link";
import type { SeasonalOfferData } from "@/lib/types";
import { seasonBenefit } from "@/lib/redesign/season";
import { ArrowRight } from "./icons";

/**
 * Сезонная строка под hero — одна линия, не баннер: студийное объявление
 * с латунной точкой, а не «акция!!!» в рамке. Данные из seasonal_offer
 * (админка), ссылка — расчёт под сезонную услугу. Показывается, пока сезон
 * активен (см. season.ts).
 */
interface SeasonBarProps {
  offer: SeasonalOfferData;
  href: string;
  /** Короче на страницах услуг: там она стоит между hero и прайсом */
  compact?: boolean;
}

export default function SeasonBar({ offer, href, compact = false }: SeasonBarProps) {
  return (
    <div
      className="border-b border-line"
      data-gate-new="сезонная строка: акция из seasonal_offer (владелец 03.09: сезон оклейки зон риска)"
    >
      <div className={compact ? "ds-container py-3" : "ds-container py-4"}>
        <Link
          href={href}
          className="ds-focus group flex flex-wrap items-center gap-x-4 gap-y-1 rounded-sm text-body-sm"
        >
          <span className="flex items-center gap-2.5 font-semibold text-ink">
            <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-pill bg-accent" />
            {offer.title}
          </span>
          <span className="text-ink-secondary">{offer.description}</span>
          <span className="ds-nums text-accent">{seasonBenefit(offer)}</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-ink-secondary transition-colors duration-150 group-hover:text-ink">
            Рассчитать
            <ArrowRight size={14} className="transition-transform duration-250 group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
