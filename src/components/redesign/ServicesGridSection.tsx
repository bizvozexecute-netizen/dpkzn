import Reveal from "@/components/ds/Reveal";
import ServicesRows from "./ServicesRows";

/**
 * Услуги на главной (03-template-home.md §5) — строчный список вместо сетки
 * карточек (решение владельца 02.09). Контракт пропсов primary/rest сохранён,
 * чтобы не трогать page.tsx: список просто склеивает их — все 19 ссылок
 * всегда в DOM, это главный узел внутренней перелинковки.
 */

export interface ServiceGridItem {
  slug: string;
  href: string;
  title: string;
  tagline: string;
  priceFrom: string | null;
  image: string;
}

interface ServicesGridSectionProps {
  title: string;
  lead: string;
  primary: ServiceGridItem[];
  rest: ServiceGridItem[];
}

export default function ServicesGridSection({ title, lead, primary, rest }: ServicesGridSectionProps) {
  return (
    <section
      id="services"
      className="ds-section ds-numbered ds-defer-layout [--section-height:2400px]"
      data-gate-new="список услуг: в старой разметке было 6 карточек из 19, ТЗ главной §5 требует все — новые названия и подписи здесь ожидаемы, потери по-прежнему ловятся"
    >
      <div className="ds-container relative">
        <span aria-hidden="true" className="ds-secnum" />
        <Reveal variant="line">
          <h2 className="font-display text-h2 text-ink">{title}</h2>
          <p className="mt-3 max-w-[56ch] text-body text-ink-secondary">{lead}</p>
        </Reveal>

        <div className="mt-10">
          <ServicesRows items={[...primary, ...rest]} />
        </div>
      </div>
    </section>
  );
}
