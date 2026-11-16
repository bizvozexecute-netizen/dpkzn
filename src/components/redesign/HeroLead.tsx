"use client";

import LeadForm from "@/components/ds/LeadForm";
import type { CarClass } from "@/lib/types";

/**
 * Форма телефона в первом экране — главное действие страницы (владелец
 * 23.09.2026). Встаёт ровно на место прежнего мини-старта квиза (HeroQuizStart):
 * это замена клиентского острова, а не добавление второго, поэтому первый
 * экран не тяжелеет.
 *
 * Зачем. На телефоне (69% трафика) до единственной формы было 8 экранов
 * прокрутки, и за месяц 19 стартов квиза не дали ни одной заявки. Здесь
 * номер оставляют, не прокручивая страницу.
 */
interface HeroLeadProps {
  /** Место формы для отчёта; у страницы-моста антикора — свой источник */
  source: "hero:home" | "hero:service" | "antikor-bridge";
  carClasses: CarClass[];
  /** H1 страницы услуги — уходит в заявку, чтобы мастер знал, о чём звонок */
  service?: string;
  messengers: { whatsappUrl: string; telegramUrl: string; maxUrl?: string };
}

export default function HeroLead({ source, carClasses, service, messengers }: HeroLeadProps) {
  return (
    <LeadForm
      source={source}
      gateNote="форма телефона в первом экране вместо мини-старта квиза: на телефоне квиз не дал ни одной заявки за месяц (владелец 23.09.2026)"
      variant="inline"
      onPhoto
      // Без подбора автомобиля: в первом экране главное — номер, модель мастер
      // уточнит при звонке. Ссылка «Указать автомобиль» добавляла третью строку
      // мелкого текста под формой (владелец 24.09: «слишком много слов»)
      carClasses={carClasses}
      service={service}
      submitLabel="Перезвоните мне"
      submitLabelShort="Перезвоните"
      // «15 минут» уже обещает строка выгоды над формой — здесь снимаем страх
      hint="Один звонок по вашему вопросу, без спама"
      doneText="Если удобнее переписываться — напишите в мессенджер, ответим там же."
      messengers={messengers}
      className="mt-6 max-w-[480px]"
    />
  );
}
