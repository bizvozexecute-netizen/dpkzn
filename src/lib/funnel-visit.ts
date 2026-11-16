export interface FunnelVisit {
  id: string;
  landing: string;
  source: string;
  medium: string;
  campaign: string;
}

interface Session { visit: FunnelVisit; lastActivity: number; tag: string }
const key = "dp_funnel_session_v1";
let session: Session | undefined;
let entry = true;
let sent = "";
let pending = "";

export function currentVisit(): FunnelVisit {
  if (!session) {
    try { session = JSON.parse(sessionStorage.getItem(key) || "null") || undefined; } catch {}
  }
  const now = Date.now();
  const params = new URLSearchParams(location.search);
  const field = (name: string) => (params.get(name) || "").trim().slice(0, 120);
  const click = field("yclid") ? "yandex" : field("vk_aid") || field("rb_clickid") ? "vk" : "";
  const source = field("utm_source").toLowerCase() || click;
  const medium = field("utm_medium").toLowerCase() || (click ? "cpc" : "");
  const campaign = field("utm_campaign");
  const tag = JSON.stringify([source, medium, campaign, field("yclid"), field("vk_aid"), field("rb_clickid")]);
  let ref = "";
  if (entry && document.referrer) {
    try {
      const host = new URL(document.referrer).hostname.replace(/^www\./, "");
      if (host !== location.hostname.replace(/^www\./, "")) ref = host;
    } catch {}
  }
  if (!session?.visit?.id || now - session.lastActivity >= 1800000 ||
      ((source || medium || campaign) && session.tag !== tag) || (entry && ref && performance.getEntriesByType("navigation").some(n => (n as PerformanceNavigationTiming).type === "navigate"))) {
    session = { visit: { id: crypto.randomUUID(), landing: location.pathname.slice(0, 400),
      source: source || ref || "Прямой / неизвестный", medium: medium || (ref && !source ? "referral" : ""), campaign },
      lastActivity: now, tag };
  }
  entry = false;
  session.lastActivity = now;
  try { sessionStorage.setItem(key, JSON.stringify(session)); } catch {}
  return session.visit;
}

export function recordVisit() {
  const visit = currentVisit();
  if (sent === visit.id || pending === visit.id) return;
  pending = visit.id;
  void fetch("/api/visits", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(visit), keepalive: true }).then(r => { if (r.ok) sent = visit.id; })
    .catch(() => {}).finally(() => { if (pending === visit.id) pending = ""; });
}
