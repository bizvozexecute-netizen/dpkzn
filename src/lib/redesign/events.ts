/**
 * Общение между компонентами страницы без общего контекста.
 *
 * Прайс, анатомия и sticky CTA живут в разных секциях и монтируются независимо;
 * тащить ради трёх сигналов провайдер на всё дерево дороже, чем два CustomEvent.
 */

/** Прайс / анатомия → квиз: подставить пакет или зоны и проскроллить к квизу. */
export const QUIZ_PRESET_EVENT = "ds:quiz-preset";

/** Квиз → sticky CTA: открыт шаг контакта, второй CTA в кадре не нужен. */
export const QUIZ_CONTACT_EVENT = "ds:quiz-contact";

export interface QuizPresetDetail {
  /** Название пакета из прайса */
  packageName?: string;
  /** Выбранные зоны кузова (из «Анатомии») */
  zones?: string[];
  /** Класс авто из мини-старта в hero: шаг 1 считается пройденным */
  carClass?: string;
  /** Марка и модель, если класс определён по справочнику (CarPicker) */
  carBrand?: string;
}

export function sendQuizPreset(detail: QuizPresetDetail) {
  window.dispatchEvent(new CustomEvent<QuizPresetDetail>(QUIZ_PRESET_EVENT, { detail }));
  document.querySelector("#quiz")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function sendQuizContactStep(active: boolean) {
  window.dispatchEvent(new CustomEvent<{ active: boolean }>(QUIZ_CONTACT_EVENT, { detail: { active } }));
}

/** Любая LeadForm → остальные формы страницы: заявка принята, повторно номер
 *  не просим. Событие, а не метка в localStorage: метка пережила бы
 *  перезагрузку и спрятала бы форму у вернувшегося через неделю клиента. */
export const LEAD_ACCEPTED_EVENT = "ds:lead-accepted";

export function sendLeadAccepted(source: string, instance: string) {
  window.dispatchEvent(
    new CustomEvent<{ source: string; instance: string }>(LEAD_ACCEPTED_EVENT, { detail: { source, instance } }),
  );
}

/** LeadForm → sticky CTA: в форме фокус, плавающая капсула уходит (на десктопе
 *  она висит в том же углу, где формы после портфолио и отзывов). */
export const LEAD_FOCUS_EVENT = "ds:lead-focus";

export function sendLeadFocus(active: boolean) {
  window.dispatchEvent(new CustomEvent<{ active: boolean }>(LEAD_FOCUS_EVENT, { detail: { active } }));
}

/** Анатомия → sticky CTA: открыт нижний шит зоны, мобильной панели CTA
 *  нельзя стоять под ним второй стопкой (ДС §4.10 — один плавающий элемент). */
export const ANATOMY_SHEET_EVENT = "ds:anatomy-sheet";

export function sendAnatomySheet(open: boolean) {
  window.dispatchEvent(new CustomEvent<{ open: boolean }>(ANATOMY_SHEET_EVENT, { detail: { open } }));
}
