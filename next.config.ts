import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // По умолчанию Next разрешает только качество 75. Постеру hero этого мало:
    // на экране с DPR 2 он сжимался до ~7 КБ, плотность падала ниже
    // 0.05 бит/пиксель, и Chrome выбрасывал картинку из кандидатов LCP —
    // метрика уезжала на текстовый абзац.
    qualities: [75, 80],
    // Разрешаем query у локальных картинок: ассеты «Анатомии» versioned
    // (?v=) из-за immutable-кеша — см. src/lib/redesign/anatomy-version.ts
    localPatterns: [{ pathname: "/**" }],
  },
  async redirects() {
    // Кейсы-дубли polirovka-work-1…6 — те же машины, что и именованные работы
    // (03-template-portfolio.md): страницы схлопываются в канонические 301-ом.
    const dupes: Record<string, string> = {
      "polirovka-work-1": "porsche-cayenne-polish",
      "polirovka-work-2": "mercedes-gla-polish",
      "polirovka-work-3": "bmw-420d-detailing",
      "polirovka-work-4": "mercedes-gla-polish",
      "polirovka-work-5": "porsche-cayenne-polish",
      "polirovka-work-6": "bmw-420d-detailing",
    };
    // statusCode 301, а не permanent:true (=308): ТЗ портфолио требует 301,
    // и классический код Яндекс склеивает без сюрпризов.
    return Object.entries(dupes).map(([from, to]) => ({
      source: `/portfolio/${from}`,
      destination: `/portfolio/${to}`,
      statusCode: 301,
    }));
  },
  async headers() {
    return [
      {
        // Стиллы, маски и пролёты меняются только вместе с релизом ассетов,
        // а по умолчанию Next отдаёт public/ с max-age=0 — каждый повторный
        // показ кадра уходил в сеть за теми же 58 КБ.
        source: "/anatomy/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/video/hero/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
