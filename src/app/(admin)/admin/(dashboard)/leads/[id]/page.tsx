"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import FormField from "@/app/(admin)/admin/_components/FormField";
import FormActions from "@/app/(admin)/admin/_components/FormActions";

/**
 * Карточка заявки: контактные поля и статус редактируются, всё, что пришло
 * с сайта (utm, атрибуция, страница) — read-only. Для строк из вебвизора —
 * подсказка, как найти запись, и фокус на поле телефона (?focus=phone).
 */

interface Lead {
  contacts?: {code:string;channel:string;confirmedAt:string;page:string|null;landing:string|null;source:string|null;medium:string|null;campaign:string|null}[];
  id: number;
  createdAt: string;
  updatedAt: string;
  status: string;
  origin: string;
  phone: string | null;
  name: string | null;
  carClass: string | null;
  carBrand: string | null;
  service: string | null;
  servicesJson: string | null;
  photosJson: string | null;
  urgency: string | null;
  channel: string | null;
  source: string | null;
  page: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  yclid: string | null;
  tgOk: boolean | null;
  crmOk: boolean | null;
  visitDateTime: string | null;
  goal: string | null;
  clientId: string | null;
  phoneTail: string | null;
  webvisorHint: string | null;
  managerNote: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  booked: "Записан в студию",
  won: "Сделка",
  lost: "Отказ",
  needs_phone: "Нужен номер",
};

export default function LeadCardPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const phoneRef = useRef<HTMLInputElement>(null);

  const [lead, setLead] = useState<Lead | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("new");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/leads/${id}`)
      .then((r) => r.json())
      .then((data: Lead) => {
        setLead(data);
        setPhone(data.phone ?? "");
        setName(data.name ?? "");
        setStatus(data.status);
        setNote(data.managerNote ?? "");
        if (search.get("focus") === "phone") {
          setTimeout(() => phoneRef.current?.focus(), 50);
        }
      })
      .catch(() => setError("Не удалось загрузить заявку"));
  }, [id, search]);

  async function handleSave() {
    if (!lead) return;
    setSaving(true);
    setError("");
    try {
      // Вписали номер в «нужен номер» — заявка автоматически становится новой
      const nextStatus =
        lead.status === "needs_phone" && phone && status === "needs_phone" ? "new" : status;
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name, status: nextStatus, managerNote: note }),
      });
      if (!res.ok) {
        setError("Ошибка сохранения");
        return;
      }
      router.push("/admin/leads");
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg bg-[#252525] border border-[#333333] text-[#F5F5F5] text-sm focus:border-[#00F0FF] focus:outline-none transition-colors";

  if (!lead) {
    return <div className="text-center py-12 text-[#A0A0A0]">{error || "Загрузка..."}</div>;
  }

  const services: string[] = lead.servicesJson ? JSON.parse(lead.servicesJson) : [];
  const msk = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—";

  const meta: [string, string | null][] = [
    ["Создана", lead.visitDateTime ? `${lead.visitDateTime} (визит, МСК)` : msk(lead.createdAt)],
    ["Происхождение", { site: "с сайта", "import-jsonl": "импорт журнала", webvisor: "вебвизор", manual: "вручную" }[lead.origin] ?? lead.origin],
    ["Услуга", lead.service],
    ["Услуги (квиз)", services.length ? services.join(", ") : null],
    ["Класс авто", lead.carClass],
    ["Марка", lead.carBrand],
    ["Срочность", lead.urgency],
    ["Канал связи", lead.channel],
    ["Источник", lead.source],
    ["Страница", lead.page],
    ["UTM", [lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ") || null],
    ["Креатив / запрос", [lead.utmContent, lead.utmTerm].filter(Boolean).join(" / ") || null],
    ["Доставка", lead.tgOk == null ? null : `Telegram: ${lead.tgOk ? "да" : "НЕТ"}${lead.crmOk == null ? "" : `, CRM: ${lead.crmOk ? "да" : "нет"}`}`],
  ];

  return (
    <div>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/leads")}
            className="text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors text-sm"
          >
            &larr; Назад
          </button>
          <h1 className="text-2xl font-bold text-[#F5F5F5]">
            Заявка {lead.phone || (lead.phoneTail ? `···${lead.phoneTail}` : `#${lead.id}`)}
          </h1>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-[#FF4444]/10 border border-[#FF4444]/30 text-[#FF4444] text-sm">
            {error}
          </div>
        )}

        {lead.photosJson && <section className="rounded-xl border border-[#333] p-6"><h2 className="mb-3 font-semibold">Фотографии клиента</h2><ul className="space-y-2">{(JSON.parse(lead.photosJson) as {id:string;url:string}[]).map((photo,i)=><li key={photo.id}><a href={photo.url} target="_blank" rel="noopener noreferrer" className="underline">Открыть фото {i+1}</a></li>)}</ul></section>}
        {lead.origin === "webvisor" && (
          <div className="p-4 rounded-xl bg-[#FFB020]/10 border border-[#FFB020]/30 text-sm text-[#FFB020] space-y-1">
            <p className="font-semibold">Номер достаётся из записи вебвизора Метрики:</p>
            <p className="text-[#F5F5F5]">
              {lead.webvisorHint ||
                `Вебвизор → фильтр по дате ${lead.visitDateTime ?? ""} и странице ${lead.page ?? ""}`}
            </p>
            {lead.phoneTail && <p>Хвост номера для сверки: ···{lead.phoneTail}</p>}
            {lead.clientId && (
              <button
                onClick={() => navigator.clipboard?.writeText(lead.clientId!)}
                className="underline decoration-dotted hover:text-[#F5F5F5]"
              >
                Скопировать ClientID {lead.clientId}
              </button>
            )}
          </div>
        )}

        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 space-y-5">
          <FormField label="Телефон">
            <input
              ref={phoneRef}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 ___ ___-__-__"
              className={inputClass}
            />
          </FormField>

          <FormField label="Имя">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </FormField>

          <FormField label="Статус">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              {Object.entries(STATUS_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>

          {Boolean(lead.contacts?.length) && <div className="space-y-3">
            <h2 className="font-semibold">Подтверждённые звонки и переписки клиента</h2>
            {lead.contacts?.map(c=><div key={c.code} className="rounded bg-[#252525] p-3 text-sm">
              <strong>{c.channel}</strong> · {msk(c.confirmedAt)}
              <p>Страница входа: {c.landing || "не установлена"} · Страница обращения: {c.page || "не установлена"}</p>
              <p>Источник: {[c.source,c.medium,c.campaign].filter(Boolean).join(" / ") || "не установлен"}</p>
            </div>)}
          </div>}
          <FormField label="Заметка менеджера">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputClass} />
          </FormField>

          <div className="border-t border-[#333333] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {meta
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <span className="text-[#707070]">{k}: </span>
                  <span className="text-[#A0A0A0]">{v}</span>
                </div>
              ))}
          </div>

          <FormActions
            onSave={handleSave}
            onCancel={() => router.push("/admin/leads")}
            loading={saving}
            saveLabel="Сохранить"
          />
        </div>
      </div>
    </div>
  );
}
