"use client";

import { contactChannels } from "@/lib/contact-channels";
import { useState } from "react";
import { useRouter } from "next/navigation";
import FormField from "@/app/(admin)/admin/_components/FormField";
import FormActions from "@/app/(admin)/admin/_components/FormActions";

/** Ручное создание заявки: звонок, переписка в мессенджере, вебвизор. */
export default function LeadNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    phone: "",
    name: "",
    service: "",
    source: "",
    managerNote: "", contactChannel: "", contactCode: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.phone && !form.managerNote) {
      setError("Укажите телефон или хотя бы заметку, откуда заявка");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Ошибка сохранения");
        return;
      }
      router.push(result.id ? "/admin/leads/" + result.id : "/admin/leads");
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg bg-[#252525] border border-[#333333] text-[#F5F5F5] text-sm focus:border-[#00F0FF] focus:outline-none transition-colors";

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
          <h1 className="text-2xl font-bold text-[#F5F5F5]">Новая заявка</h1>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-[#FF4444]/10 border border-[#FF4444]/30 text-[#FF4444] text-sm">
            {error}
          </div>
        )}

        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 space-y-5">
          <FormField label="Подтверждённое обращение">
            <select aria-label="Канал обращения" className={inputClass} value={form.contactChannel} onChange={e=>updateField("contactChannel",e.target.value)}>
              <option value="">Обычная ручная заявка</option>
              {contactChannels.map(c=><option key={c}>{c}</option>)}
            </select>
          </FormField>
          {form.contactChannel && <FormField label="Код обращения с сайта">
            <input aria-label="Код обращения" className={inputClass} value={form.contactCode} onChange={e=>updateField("contactCode",e.target.value)} />
            <p className="mt-2 text-sm text-gray-400">Заполняйте после разговора или получения сообщения. Попросите номер клиента. Без кода обращение сохранится без подтверждённого рекламного источника.</p>
          </FormField>}
          <FormField label="Телефон">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+7 ___ ___-__-__"
              className={inputClass}
            />
          </FormField>

          <FormField label="Имя">
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className={inputClass}
            />
          </FormField>

          <FormField label="Услуга">
            <input
              type="text"
              value={form.service}
              onChange={(e) => updateField("service", e.target.value)}
              placeholder="Антикор, полировка..."
              className={inputClass}
            />
          </FormField>

          <FormField label="Откуда пришла">
            <input
              type="text"
              value={form.source}
              onChange={(e) => updateField("source", e.target.value)}
              placeholder="звонок / WhatsApp / вебвизор..."
              className={inputClass}
            />
          </FormField>

          <FormField label="Заметка">
            <textarea
              value={form.managerNote}
              onChange={(e) => updateField("managerNote", e.target.value)}
              rows={3}
              className={inputClass}
            />
          </FormField>

          <FormActions
            onSave={handleSave}
            onCancel={() => router.push("/admin/leads")}
            loading={saving}
            saveLabel="Создать заявку"
          />
        </div>
      </div>
    </div>
  );
}
