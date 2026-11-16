import { currentVisit } from "./funnel-visit";
import { resolveAttribution } from "./attribution";

export interface FormData {
  name?: string;
  phone: string;
  service?: string;
  carClass?: string;
  services?: string[];
  urgency?: string;
  source?: string;
  [key: string]: unknown;
}

export async function submitForm(data: FormData, photos: File[] = []): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize phone before sending
    let phone = data.phone.replace(/\D/g, "");
    if (phone.length === 10) phone = "7" + phone;
    if (phone.startsWith("8") && phone.length === 11) phone = "7" + phone.slice(1);

    const { utm, attribution } = resolveAttribution();

    let visit;
    try { visit = currentVisit(); } catch { /* Tracking must not block a lead. */ }
    const payload = {
      visit,
      ...data,
      phone: "+" + phone,
      utm,
      attribution,
      page: typeof window !== "undefined" ? window.location.pathname : "",
      timestamp: new Date().toISOString(),
    };

    const multipart = new globalThis.FormData();
    if (photos.length) {
      multipart.append("payload", JSON.stringify(payload));
      photos.forEach(photo => multipart.append("photos", photo));
    }
    const response = await fetch("/api/submit", {
      method: "POST",
      headers: photos.length ? undefined : { "Content-Type": "application/json" },
      body: photos.length ? multipart : JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const msg = body?.details?.fieldErrors?.phone?.[0] || body?.error || `Ошибка ${response.status}`;
      throw new Error(msg);
    }

    // Mark form as submitted in localStorage.
    // Своя обёртка: в приватном режиме Safari и при переполненной квоте setItem бросает,
    // и без неё пользователь увидел бы «Ошибка отправки» при уже принятой заявке.
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("dp_form_submitted", "true");
        localStorage.setItem("dp_form_submitted_at", new Date().toISOString());
      } catch {
        // маркер нужен только для подавления попапов — на успех заявки не влияет
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ошибка отправки",
    };
  }
}

export function isFormSubmitted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("dp_form_submitted") === "true";
}
