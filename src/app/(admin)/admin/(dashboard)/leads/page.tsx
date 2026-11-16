"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DataTable from "@/app/(admin)/admin/_components/DataTable";
import ConfirmDialog from "@/app/(admin)/admin/_components/ConfirmDialog";

/**
 * Микро-CRM: список заявок (data/leads.db). Заявки с сайта падают сюда
 * автоматически; строки из вебвизора приходят импортом со статусом
 * «нужен номер» — телефон вписывается в карточке после просмотра записи.
 */

interface Lead {
  id: number;
  createdAt: string;
  status: string;
  origin: string;
  phone: string | null;
  name: string | null;
  service: string | null;
  page: string | null;
  source: string | null;
  phoneTail: string | null;
  visitDateTime: string | null;
  [key: string]: unknown;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  booked: "Записан в студию",
  won: "Сделка",
  lost: "Отказ",
  needs_phone: "Нужен номер",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-[#CCFF00]/20 text-[#CCFF00]",
  in_progress: "bg-[#4A9EFF]/20 text-[#4A9EFF]",
  won: "bg-[#3ddc84]/20 text-[#3ddc84]",
  lost: "bg-[#FF4444]/20 text-[#FF4444]",
  needs_phone: "bg-[#FFB020]/20 text-[#FFB020]",
};

const TABS = ["all", "new", "needs_phone", "in_progress", "booked", "won", "lost"] as const;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function LeadsListPage() {
  const router = useRouter();
  const [items, setItems] = useState<Lead[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLeads = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const qs = status === "all" ? "" : `?status=${status}`;
      const res = await fetch(`/api/admin/leads${qs}`);
      setItems(await res.json());
    } catch {
      console.error("Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads(tab);
  }, [tab, fetchLeads]);

  async function changeStatus(lead: Lead, status: string) {
    // Оптимистично: строка меняется сразу, откат при ошибке сети
    const prev = lead.status;
    setItems((list) => list.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    try {
      await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      setItems((list) => list.map((l) => (l.id === lead.id ? { ...l, status: prev } : l)));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/leads/${deleteTarget.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    {
      key: "createdAt",
      label: "Дата",
      render: (l: Lead) => (
        <span className="whitespace-nowrap text-[#A0A0A0]">{fmtDate(l.visitDateTime ?? l.createdAt)}</span>
      ),
    },
    {
      key: "phone",
      label: "Телефон",
      render: (l: Lead) =>
        l.phone ? (
          <span className="font-medium text-[#F5F5F5]">{l.phone}</span>
        ) : (
          <span className="text-[#FFB020]">
            {l.phoneTail ? `···${l.phoneTail}` : "—"}{" "}
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/admin/leads/${l.id}?focus=phone`);
              }}
              className="ml-1 underline decoration-dotted hover:text-[#F5F5F5]"
            >
              вписать
            </button>
          </span>
        ),
    },
    { key: "name", label: "Имя", render: (l: Lead) => <span>{l.name || "—"}</span> },
    {
      key: "service",
      label: "Услуга / страница",
      render: (l: Lead) => (
        <span className="text-[#A0A0A0]">
          {l.service || "—"}
          {l.page ? <span className="block text-xs opacity-70">{l.page}</span> : null}
        </span>
      ),
    },
    { key: "source", label: "Источник", render: (l: Lead) => <span className="text-[#A0A0A0]">{l.source || l.origin}</span> },
    {
      key: "status",
      label: "Статус",
      render: (l: Lead) => (
        <select
          value={l.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            void changeStatus(l, e.target.value);
          }}
          className={`rounded px-2 py-1 text-xs font-medium border-0 outline-none cursor-pointer bg-[#1A1A1A] ${STATUS_COLORS[l.status] ?? ""}`}
        >
          {Object.entries(STATUS_LABELS).map(([v, label]) => (
            <option key={v} value={v} className="bg-[#1A1A1A] text-[#F5F5F5]">
              {label}
            </option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <div>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#F5F5F5]">Заявки</h1>
          <button
            onClick={() => router.push("/admin/leads/new")}
            className="px-5 py-2.5 rounded-lg bg-[#CCFF00] text-[#0E0E0E] text-sm font-semibold hover:bg-[#b8e600] transition-colors"
          >
            Добавить заявку
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-full text-sm transition-colors ${
                tab === t
                  ? "bg-[#CCFF00]/20 text-[#CCFF00] border border-[#CCFF00]/40"
                  : "border border-[#333333] text-[#A0A0A0] hover:text-[#F5F5F5]"
              }`}
            >
              {t === "all" ? "Все" : STATUS_LABELS[t]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#A0A0A0]">Загрузка...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-[#A0A0A0]">Заявок нет</div>
        ) : (
          <DataTable
            columns={columns}
            data={items}
            onEdit={(item) => router.push(`/admin/leads/${item.id}`)}
            onDelete={(item) => setDeleteTarget(item)}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удалить заявку"
        message={`Удалить заявку ${deleteTarget?.phone || deleteTarget?.phoneTail || `#${deleteTarget?.id}`}? Действие необратимо.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
