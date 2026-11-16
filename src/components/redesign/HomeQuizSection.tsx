"use client";

import type { CarClass } from "@/lib/types";
import Quiz from "@/components/ds/Quiz";
import LeadForm from "@/components/ds/LeadForm";

/**
 * Квиз главной и списков (портфолио, кейсы). Шаг «что делаем» — восемь ключевых
 * услуг плюс «Другое»; сюда же приходят зоны, выбранные в «Анатомии» (общее
 * событие ds:quiz-preset). Заголовок и подпись — тексты текущей страницы.
 *
 * Над квизом — короткий путь: одно поле телефона (владелец 23.09.2026). За
 * месяц на телефоне квиз начали 19 раз и не закончили ни разу: четыре шага до
 * поля телефона слишком длинно. Теперь человек видит поле раньше первого шага,
 * а квиз остаётся для тех, кто хочет посчитать сам.
 */
interface HomeQuizSectionProps {
  title: string;
  lead: string;
  options: { value: string; label: string }[];
  carClasses: CarClass[];
  whatsappUrl: string;
  telegramUrl: string;
  /** Страница входа — мастер видит её в заявке */
  serviceSlug?: string;
  /** Спокойная строка под квизом — например, про такси (ТЗ портфолио) */
  note?: string;
}

export default function HomeQuizSection({
  title,
  lead,
  options,
  carClasses,
  whatsappUrl,
  telegramUrl,
  serviceSlug = "home",
  note,
}: HomeQuizSectionProps) {
  return (
    <section id="quiz" className="ds-section ds-scene">
      <div className="ds-container">
        <div className="ds-prose-width text-center">
          <h2 className="font-display text-h2 text-ink">{title}</h2>
          <p className="mt-3 text-body text-ink-secondary">{lead}</p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          <LeadForm
            source="before-quiz"
            gateNote="короткий путь над квизом: поле телефона раньше первого из четырёх шагов (владелец 23.09.2026)"
            title="Некогда отвечать на вопросы? Оставьте номер"
            submitLabel="Перезвоните мне"
            submitLabelShort="Перезвоните"
            hint="Перезвоним и назовём цену."
            messengers={{ whatsappUrl, telegramUrl }}
            className="rounded-xl border border-line bg-elevated p-5 md:p-6"
          />

          <div
            className="my-6 flex items-center gap-3 text-caption text-ink-tertiary"
            data-gate-new="разделитель между коротким путём и квизом"
          >
            <span className="h-px flex-1 bg-line" />
            или посчитайте сами — 4 вопроса
            <span className="h-px flex-1 bg-line" />
          </div>

          <Quiz
            hideHeading
            serviceSlug={serviceSlug}
            carClasses={carClasses}
            optionsTitle="Что делаем?"
            multiple
            options={options}
            whatsappUrl={whatsappUrl}
            telegramUrl={telegramUrl}
          />
          {note && (
            <p
              className="mt-4 text-center text-caption text-ink-secondary"
              data-gate-new="спокойная строка про такси в CTA-блоке (ТЗ портфолио, без плашки)"
            >
              {note}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
