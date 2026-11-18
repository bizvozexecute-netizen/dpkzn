import { METRIKA_ID, VK_PIXEL_ID } from "./constants";

// Yandex.Metrika + VK Ads (top-Mail.Ru) types
declare global {
  interface Window {
    ym?: (id: number, action: string, target?: string, params?: Record<string, unknown>) => void;
    _tmr?: Record<string, unknown>[];
  }
}

const METRIKA_NUM = Number(METRIKA_ID);
export function ym(action: string, target?: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.ym) {
    window.ym(METRIKA_NUM, action, target, params);
  }
}

/**
 * Какие цели уходят в VK Ads.
 *
 * Намеренно не все 26: VK оптимизируется по ОДНОМУ выбранному событию, и полный
 * список превратил бы выбор в лотерею. Схема такая:
 *  - `lead` — единая цель оптимизации. Только те четыре цели, что срабатывают
 *    после успешного ответа сервера; `*_submit` до ответа дали бы двойной счёт.
 *  - микроконверсии — при 20–40 лидах в месяц алгоритму не на чем учиться,
 *    а look-alike требует сегмента около тысячи человек.
 */
const VK_GOALS: Record<string, string[]> = {
  form_success: ["lead", "lead_form"],
  quiz_success: ["lead", "lead_quiz"],
  callback_success: ["lead_callback"],

  phone_click: ["contact_click"],
  whatsapp_click: ["contact_click"],
  telegram_click: ["contact_click"],
  max_click: ["contact_click"],

  quiz_start: ["quiz_start"],
  page_scroll_50: ["engaged"],
};

function vkPush(event: Record<string, unknown>) {
  if (!VK_PIXEL_ID || typeof window === "undefined") return;
  // Очередь — массив: всё, что запушено до загрузки библиотеки, она проигрывает при старте.
  window._tmr = window._tmr || [];
  window._tmr.push({ id: VK_PIXEL_ID, ...event });
}

export function vkPageView(url?: string) {
  vkPush({ type: "pageView", start: Date.now(), ...(url ? { url } : {}) });
}

export function reachGoal(target: string, params?: Record<string, unknown>) {
  ym("reachGoal", target, params);

  for (const goal of VK_GOALS[target] ?? []) {
    vkPush({ type: "reachGoal", goal, ...(params?.value ? { value: params.value } : {}) });
  }
}

export const goals = {
  // Forms
  FORM_OPEN: "form_open",
  /** Форма попала в экран (посадочные сигнализаций) */
  FORM_VIEW: "form_view",
  FORM_SUBMIT: "form_submit",
  FORM_SUCCESS: "form_success",
  FORM_ERROR: "form_error",

  // Quiz
  QUIZ_START: "quiz_start",
  QUIZ_STEP_2: "quiz_step_2",
  QUIZ_STEP_3: "quiz_step_3",
  QUIZ_STEP_4: "quiz_step_4",
  QUIZ_SUBMIT: "quiz_submit",
  QUIZ_SUCCESS: "quiz_success",

  // Contacts
  PHONE_CLICK: "phone_click",
  WHATSAPP_CLICK: "whatsapp_click",
  TELEGRAM_CLICK: "telegram_click",
  MAX_CLICK: "max_click",
  CALLBACK_OPEN: "callback_open",
  CALLBACK_SUBMIT: "callback_submit",
  CALLBACK_SUCCESS: "callback_success",

  // Navigation
  MENU_OPEN: "menu_open",
  SERVICE_CLICK: "service_click",
  PORTFOLIO_VIEW: "portfolio_view",
  VK_CLICK: "vk_click",

  // Funnel
  EXIT_POPUP_SHOW: "exit_popup_show",
  EXIT_POPUP_SUBMIT: "exit_popup_submit",
  SOCIAL_PROOF_SHOW: "social_proof_show",
  TIMER_VIEW: "timer_view",
  LOAD_BAR_VIEW: "load_bar_view",

  // Page
  PAGE_SCROLL_50: "page_scroll_50",
  PAGE_SCROLL_100: "page_scroll_100",
} as const;

/** События накапливаются в очереди до фоновой загрузки счётчика. */
export const METRIKA_SCRIPT = `
  (function (m, e, t, r, i, k, a) {
    m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments) };
    m[i].l = 1 * new Date();

    var loaded = false;
    var load = function () {
      if (loaded) return;
      loaded = true;
      for (var j = 0; j < e.scripts.length; j++) { if (e.scripts[j].src === r) { return; } }
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    };

    var schedule = function () {
      m.setTimeout(function () {
        if (m.requestIdleCallback) m.requestIdleCallback(load, { timeout: 2000 });
        else load();
      }, 4000);
    };
    if (e.readyState === "complete") schedule();
    else m.addEventListener("load", schedule, { once: true });
  })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}", "ym");

  ym(${METRIKA_ID}, "init", {
    ssr:true,
    webvisor:true,
    clickmap:true,
    ecommerce:"dataLayer",
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce:true,
    trackLinks:true
  });
`;

/**
 * Пиксель VK Ads (top-Mail.Ru).
 *
 * Первый pageView кладётся в очередь синхронно и без сети, а саму библиотеку грузим
 * только после window load (и в простое браузера) — сторонний скрипт не должен
 * конкурировать за сеть и main thread в окне LCP: 80% трафика мобильный, бюджет LCP <2.5s.
 * События, случившиеся до загрузки, не теряются — очередь проигрывается при инициализации.
 */
export const VK_PIXEL_SCRIPT = `
  var _tmr = window._tmr || (window._tmr = []);
  _tmr.push({id: "${VK_PIXEL_ID}", type: "pageView", start: (new Date()).getTime()});
  (function (d, w) {
    var load = function () {
      if (d.getElementById("tmr-code")) return;
      var ts = d.createElement("script");
      ts.type = "text/javascript"; ts.async = true; ts.id = "tmr-code";
      ts.src = "https://top-fwz1.mail.ru/js/code.js";
      var f = d.getElementsByTagName("script")[0];
      f.parentNode.insertBefore(ts, f);
    };
    var defer = function () {
      if (w.requestIdleCallback) { w.requestIdleCallback(load, {timeout: 3000}); }
      else { setTimeout(load, 1500); }
    };
    if (d.readyState === "complete") { defer(); }
    else { w.addEventListener("load", defer); }
  })(document, window);
`;
