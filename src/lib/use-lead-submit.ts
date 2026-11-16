"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { submitForm, type FormData } from "@/lib/form-submit";
import { goals, reachGoal } from "@/lib/analytics";
import { formatPhoneInput, isValidPhone } from "@/lib/utils";
import { LEAD_ACCEPTED_EVENT, sendLeadAccepted } from "@/lib/redesign/events";

/**
 * Логика заявки с телефоном — одна на все формы захвата (LeadForm).
 *
 * До этого три формы дублировали её построчно и расходились в мелочах: порог
 * валидации 10 против 11 цифр, форматирование ввода только в квизе. Здесь
 * валидация — isValidPhone (10 или 11 цифр), ровно то, что принимает API.
 *
 * Цели. Набор задаётся явно: в отчёте /admin/report цели зашиты числовыми id
 * из кабинета Метрики, и форма, сменившая набор, исказила бы историю. Каждая
 * цель уходит с параметром { form: source } — так шесть форм различимы в
 * Метрике без заведения шести новых целей.
 *
 * Спам. Шесть открытых полей без капчи — повод для ловушек, но мягких:
 * скрытое поле (бот его заполнит) и время от появления формы. Время считается
 * от монтирования, а не от первого ввода: автозаполнение номера на iPhone
 * вставляет его одним тапом, и порог «от ввода» ловил бы живых людей.
 */
export type GoalSet = "form" | "callback" | "quiz";

const GOAL_MAP: Record<GoalSet, { open: string; submit: string; success: string; error: string }> = {
  form: { open: goals.FORM_OPEN, submit: goals.FORM_SUBMIT, success: goals.FORM_SUCCESS, error: goals.FORM_ERROR },
  callback: { open: goals.CALLBACK_OPEN, submit: goals.CALLBACK_SUBMIT, success: goals.FORM_SUCCESS, error: goals.FORM_ERROR },
  quiz: { open: goals.QUIZ_START, submit: goals.QUIZ_SUBMIT, success: goals.QUIZ_SUCCESS, error: goals.FORM_ERROR },
};

/** Быстрее этого после появления формы человек отправить не успевает */
const MIN_FILL_MS = 1500;

export interface UseLeadSubmitOptions {
  /** Уникальный источник — колонка source в CRM и строка в /admin/report */
  source: string;
  goals?: GoalSet;
  /** Постоянная часть заявки: service, services, carClass… Вызывается при отправке */
  payload?: () => Partial<FormData>;
}

export function useLeadSubmit({ source, goals: goalSet = "form", payload }: UseLeadSubmitOptions) {
  const [phone, setPhoneRaw] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  /** Скрытое поле-ловушка: человек его не видит, бот заполняет */
  const [trap, setTrap] = useState("");
  const mountedAt = useRef(0);
  const opened = useRef(false);
  /** Экземпляр формы: одна и та же форма (смета анатомии) стоит на странице
   *  трижды под разные ширины — сравнивать по источнику нельзя */
  const instance = useId();
  const g = GOAL_MAP[goalSet];

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  // Заявка с любой другой формы на странице — эта переходит в «уже приняли»:
  // шесть форм на главной, и человек не должен отправить номер дважды
  useEffect(() => {
    const onAccepted = (e: Event) => {
      const from = (e as CustomEvent<{ instance: string }>).detail?.instance;
      if (from !== instance) setDone(true);
    };
    window.addEventListener(LEAD_ACCEPTED_EVENT, onAccepted);
    return () => window.removeEventListener(LEAD_ACCEPTED_EVENT, onAccepted);
  }, [instance]);

  const setPhone = useCallback((raw: string) => {
    setPhoneRaw(formatPhoneInput(raw));
    setError("");
  }, []);

  /** Первое взаимодействие с формой — цель «открытие», один раз */
  const markOpen = useCallback(() => {
    if (opened.current) return;
    opened.current = true;
    reachGoal(g.open, { form: source });
  }, [g.open, source]);

  const fail = useCallback((message: string) => {
    setError(message);
    setShake(true);
    window.setTimeout(() => setShake(false), 400);
  }, []);

  const submit = useCallback(async () => {
    if (sending) return;
    if (!isValidPhone(phone)) {
      fail("Проверьте номер: нужно 10 цифр после +7");
      return;
    }
    const elapsedMs = Date.now() - mountedAt.current;
    setSending(true);
    setError("");
    markOpen();
    reachGoal(g.submit, { form: source });

    const res = await submitForm({
      channel: "Звонок",
      ...payload?.(),
      phone,
      source,
      // Ловушки уходят на сервер: там же и решается, принимать ли заявку
      // Пустые ловушки не шлём вовсе — иначе лишний ключ уедет в CRM
      website: trap || undefined,
      elapsedMs: elapsedMs < MIN_FILL_MS ? elapsedMs : undefined,
    });

    setSending(false);
    if (res.success) {
      reachGoal(g.success, { form: source });
      if (g.submit === goals.CALLBACK_SUBMIT) reachGoal(goals.CALLBACK_SUCCESS, { form: source });
      setDone(true);
      sendLeadAccepted(source, instance);
    } else {
      reachGoal(g.error, { form: source });
      fail(res.error || "Не отправилось — попробуйте ещё раз или напишите в мессенджер");
    }
  }, [sending, phone, fail, markOpen, g, source, payload, trap, instance]);

  return { phone, setPhone, sending, done, error, shake, trap, setTrap, markOpen, submit };
}
