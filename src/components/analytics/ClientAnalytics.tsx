"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { captureAttribution } from "@/lib/attribution";
import { contactChannel } from "@/lib/contact-channels";
import { currentVisit, recordVisit } from "@/lib/funnel-visit";
import { vkPageView } from "@/lib/analytics";

/**
 * Клиентская обвязка аналитики: запоминает рекламные метки и досылает просмотры
 * страниц при переходах внутри сайта.
 *
 * Зачем нужен отдельный компонент: App Router не создаёт новый хит при клиентской
 * навигации, поэтому аудитории ретаргетинга VK («был на /ppf») ловили бы только
 * прямые входы. Метрике это менее критично — там выручает accurateTrackBounce.
 *
 * Специально НЕ используется useSearchParams(): он переводит весь layout в
 * динамический рендер и снял бы статику со всех страниц сайта. Query-строку читаем
 * из window внутри эффекта — это безопасно.
 */
export default function ClientAnalytics() {
  const pathname = usePathname();
  const [code, setCode] = useState("");
  const firstRender = useRef(true);

  useEffect(() => {
    captureAttribution();
    recordVisit();

    // Первый pageView уже отправлен инлайн-скриптом — дублировать не нужно.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    vkPageView(window.location.href);
  }, [pathname]);

  useEffect(() => {
    let touchedAt = 0;
    const touch = () => {
      const now = Date.now();
      if (now - touchedAt < 10000) return;
      touchedAt = now;
      recordVisit();
    };
    document.addEventListener("click", touch, { passive: true });
    document.addEventListener("keydown", touch);
    window.addEventListener("scroll", touch, { passive: true });
    return () => {
      document.removeEventListener("click", touch);
      document.removeEventListener("keydown", touch);
      window.removeEventListener("scroll", touch);
    };
  }, []);
  useEffect(() => {
    const contact = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link) return;
      const url = new URL(link.href);
      const channel = contactChannel(url);
      if (!channel) return;
      const nextCode = crypto.randomUUID().replaceAll("-", "").slice(0,10).toUpperCase();
      const payload = { code: nextCode, visit: currentVisit(), page: location.pathname, channel };
      void fetch("/api/contact-click", {method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload),keepalive:true}).catch(()=>{});
      setCode(nextCode);
      if (channel === "WhatsApp" || channel === "Telegram") {
        const original = link.href;
        url.searchParams.set("text", [url.searchParams.get("text") || "Здравствуйте! Хочу уточнить стоимость.", "Код обращения " + nextCode].join("\n"));
        link.href = url.href;
        window.setTimeout(() => { if (link.href === url.href) link.href = original; },0);
      }
    };
    document.addEventListener("click",contact,true);
    return () => document.removeEventListener("click",contact,true);
  }, []);
  return code ? <aside role="status" className="fixed top-20 right-3 z-[80] max-w-72 rounded-lg border border-line bg-surface p-4 text-sm text-ink shadow-lg">
    Код обращения <strong>{code}</strong>. Сообщите его мастеру, чтобы он видел, с какой страницы вы обратились.
    <button type="button" className="mt-2 block underline" onClick={()=>setCode("")}>Закрыть подсказку</button>
  </aside> : null;
}
