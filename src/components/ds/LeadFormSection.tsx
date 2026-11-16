import LeadForm, { type LeadFormProps } from "./LeadForm";
import { cn } from "@/lib/utils";

/**
 * Полоса с формой захвата между секциями страницы. Серверная: заголовок и
 * пояснение рендерятся на сервере, клиентским островом остаётся только форма.
 *
 * Узкая (ds-section-sm), а не экранная: главная и так 11 экранов, и каждая
 * такая полоса — около 120 px, а не новый экран.
 *
 * Заголовок — <p>, не <h2>: гейт содержимого сверяет инвентарь H2 страницы.
 */
interface LeadFormSectionProps extends LeadFormProps {
  heading: string;
  lead?: string;
  sectionClassName?: string;
}

export default function LeadFormSection({ heading, lead, sectionClassName, gateNote, ...form }: LeadFormSectionProps) {
  return (
    <section className={cn("ds-section-sm", sectionClassName)} data-gate-new={gateNote}>
      <div className="ds-container">
        <div className="grid gap-6 rounded-xl border border-line bg-elevated p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:items-center md:gap-10 md:p-8">
          <div>
            <p className="font-display text-h4 text-ink">{heading}</p>
            {lead && <p className="mt-2 max-w-[48ch] text-body-sm text-ink-secondary">{lead}</p>}
          </div>
          <LeadForm gateNote={gateNote} {...form} />
        </div>
      </div>
    </section>
  );
}
