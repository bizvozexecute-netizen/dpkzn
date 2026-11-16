"use client";

import dynamic from "next/dynamic";
import type { CarClass } from "@/lib/types";
import type { QuizPreset } from "@/lib/redesign/quiz-presets";
import Quiz from "@/components/ds/Quiz";

/**
 * Секция единственной формы страницы.
 *
 * «Анатомия» подключается динамически и без SSR: её данные, карты попаданий и
 * видео-пролёты не должны лежать в бюджете страницы услуги ради кнопки,
 * которую нажмёт меньшинство. Заголовок и подпись секции — текущие тексты
 * страницы, поэтому у самого контейнера квиза заголовок отключён.
 */
const AnatomyOverlay = dynamic(() => import("@/components/ds/AnatomyOverlay"), { ssr: false });

interface ServiceQuizSectionProps {
  slug: string;
  serviceName: string;
  carClasses: CarClass[];
  preset: QuizPreset;
  whatsappUrl: string;
  telegramUrl: string;
}

export default function ServiceQuizSection({
  slug,
  serviceName,
  carClasses,
  preset,
  whatsappUrl,
  telegramUrl,
}: ServiceQuizSectionProps) {
  return (
    <section id="quiz" className="ds-section ds-scene">
      <div className="ds-container">
        <div className="ds-prose-width text-center">
          <h2 className="font-display text-h2 text-ink">Рассчитайте стоимость для своего авто</h2>
          <p className="mt-3 text-body text-ink-secondary">
            {slug === "ppf" ? "Укажите автомобиль и зоны оклейки. Можно приложить фото." : "Ответьте на вопросы — рассчитаем стоимость для вашего автомобиля."}
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          <Quiz
            hideHeading
            serviceSlug={slug}
            serviceName={serviceName}
            carClasses={carClasses}
            optionsTitle={preset.title}
            multiple={preset.multiple}
            options={preset.options}
            optionsExtra={
              preset.anatomy
                ? ({ selected, toggle }) => <AnatomyOverlay selected={selected} onToggle={toggle} />
                : undefined
            }
            whatsappUrl={whatsappUrl}
            telegramUrl={telegramUrl}
          />
        </div>
      </div>
    </section>
  );
}
