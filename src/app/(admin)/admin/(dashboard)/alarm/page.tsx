"use client";

import { useEffect, useState } from "react";

/**
 * Посадочные сигнализаций — минимальный CRUD без редизайна админки:
 * все поля таблицы alarm_landings; списки и FAQ — JSON.
 */

interface Landing {
  id?: number;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  navLabel: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  overline: string | null;
  lead: string;
  offerPoints: string;
  priceTitle: string;
  includedTitle: string;
  included: string;
  faq: string;
  formTitle: string;
  formHint: string;
  submitLabel: string;
  teaser: string;
}

const EMPTY: Landing = {
  slug: "", isActive: false, sortOrder: 0, navLabel: "", metaTitle: "", metaDescription: "", h1: "",
  overline: "", lead: "", offerPoints: "[]", priceTitle: "", includedTitle: "", included: "[]", faq: "[]",
  formTitle: "", formHint: "", submitLabel: "", teaser: "",
};

const TEXT_FIELDS: { key: keyof Landing; label: string; area?: boolean }[] = [
  { key: "slug", label: "Слаг (URL /ustanovka-signalizacii/…)" },
  { key: "navLabel", label: "Название в ссылках" },
  { key: "metaTitle", label: "Title (≤ 60, с «Казань» и «| Detailing Place»)" },
  { key: "metaDescription", label: "Description", area: true },
  { key: "h1", label: "H1" },
  { key: "overline", label: "Надпись над H1" },
  { key: "lead", label: "Оффер (лид)", area: true },
  { key: "offerPoints", label: "Тезисы оффера — JSON [\"…\"]", area: true },
  { key: "priceTitle", label: "Заголовок блока цен" },
  { key: "includedTitle", label: "Заголовок «что входит»" },
  { key: "included", label: "Что входит / сроки / гарантия — JSON [\"…\"]", area: true },
  { key: "faq", label: "FAQ — JSON [{\"question\":\"…\",\"answer\":\"…\"}]", area: true },
  { key: "formTitle", label: "Заголовок формы" },
  { key: "formHint", label: "Подсказка формы", area: true },
  { key: "submitLabel", label: "Текст кнопки" },
  { key: "teaser", label: "Тизер (хаб, главная, мегаменю)" },
];

const INPUT = "w-full rounded-lg border border-[#2A2A2A] bg-[#0E0E0E] px-3 py-2 text-sm text-[#F5F5F5]";

export default function AlarmAdminPage() {
  const [items, setItems] = useState<Landing[]>([]);
  const [edit, setEdit] = useState<Landing | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/admin/alarm");
    if (res.ok) setItems(await res.json());
    else setMsg("Ошибка загрузки");
  }
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/alarm")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: Landing[]) => alive && setItems(data))
      .catch(() => alive && setMsg("Ошибка загрузки"));
    return () => {
      alive = false;
    };
  }, []);

  async function save() {
    if (!edit) return;
    const res = await fetch("/api/admin/alarm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...edit, overline: edit.overline || null }),
    });
    const data = await res.json();
    if (!res.ok) return setMsg(data.error || "Ошибка сохранения");
    setItems(data);
    setEdit(null);
    setMsg("Сохранено");
  }

  async function remove(l: Landing) {
    if (!l.id || !confirm(`Удалить посадочную «${l.navLabel}»?`)) return;
    await fetch(`/api/admin/alarm?id=${l.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#F5F5F5]">Посадочные сигнализаций</h1>
        <button onClick={() => setEdit({ ...EMPTY })} className="rounded-lg bg-[#CCFF00] px-5 py-2.5 text-sm font-semibold text-[#0E0E0E]">
          Добавить
        </button>
      </div>
      {msg && <p className="text-sm text-[#A0A0A0]">{msg}</p>}

      {edit ? (
        <div className="space-y-4 rounded-xl border border-[#2A2A2A] bg-[#141414] p-6">
          <label className="flex items-center gap-2 text-sm text-[#F5F5F5]">
            <input type="checkbox" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} />
            Опубликована
          </label>
          <label className="block text-sm text-[#A0A0A0]">
            Порядок
            <input type="number" className={INPUT} value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) })} />
          </label>
          {TEXT_FIELDS.map((f) => (
            <label key={f.key} className="block text-sm text-[#A0A0A0]">
              {f.label}
              {f.area ? (
                <textarea rows={4} className={INPUT} value={String(edit[f.key] ?? "")} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} />
              ) : (
                <input className={INPUT} value={String(edit[f.key] ?? "")} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} />
              )}
              {f.key === "metaTitle" && <span className="text-xs">{edit.metaTitle.length} / 60</span>}
            </label>
          ))}
          <div className="flex gap-3">
            <button onClick={save} className="rounded-lg bg-[#CCFF00] px-5 py-2.5 text-sm font-semibold text-[#0E0E0E]">Сохранить</button>
            <button onClick={() => setEdit(null)} className="px-5 py-2.5 text-sm text-[#A0A0A0]">Отмена</button>
          </div>
        </div>
      ) : (
        <table className="w-full text-left text-sm text-[#F5F5F5]">
          <thead className="text-[#A0A0A0]">
            <tr><th className="py-2">Слаг</th><th>Название</th><th>Статус</th><th /></tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id} className="border-t border-[#2A2A2A]">
                <td className="py-2">{l.slug}</td>
                <td>{l.navLabel}</td>
                <td>{l.isActive ? "опубликована" : "скрыта"}</td>
                <td className="space-x-3 text-right">
                  <button onClick={() => setEdit({ ...l, overline: l.overline ?? "" })} className="text-[#CCFF00]">Изменить</button>
                  <button onClick={() => remove(l)} className="text-[#FF5555]">Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
