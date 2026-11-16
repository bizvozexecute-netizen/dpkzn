/**
 * Карта hero-лупов (docs/redesign/content/hero-loops.md §«Куда идёт»).
 *
 * Мэппинг живёт в коде, а не в БД: это привязка к конкретным файлам в public,
 * которых без деплоя всё равно не появится, — редактировать её из админки нечем.
 * Тексты и цены, наоборот, остаются в БД.
 *
 * Страницы без лупа получают статичное фото /images/hero/{slug}.webp.
 */
export const HERO_LOOPS: Record<string, number> = {
  // 1 — полировальник на капоте
  home: 1,
  polirovka: 1,
  "detayling-kuzova": 1,
  // 2 — гидрофоб, капли скатываются
  "zashchitnye-pokrytiya": 2,
  // 3 — снятие плёнки с глянца
  ppf: 3,
  // 4 — ракель разглаживает PPF
  broneplenka: 4,
  "oklejka-avto": 4,
  // 5 — вода и пена стекают по кузову
  himchistka: 5,
  "vyezdnoj-detayling": 5,
  // 6 — тонировочная плёнка на стекле
  tonirovka: 6,
  // 7 — Bi-LED линза зажигается
  "ustanovka-linz": 7,
  "polirovka-far": 7,
  // 8 — капли скатываются с лобового после антидождя (Kling, 03.09.2026;
  // старт-кадр — фото «после» этой же страницы, луп бесшовный)
  antidozhd: 8,
};

export interface HeroMedia {
  /** Базовый путь без расширения: .mp4 + .webm; null — статичное фото */
  videoBase: string | null;
  poster: string;
}

export function getHeroMedia(slug: string): HeroMedia {
  const loop = HERO_LOOPS[slug];
  if (!loop) return { videoBase: null, poster: `/images/hero/${slug}.webp` };
  return { videoBase: `/video/hero/loop-${loop}`, poster: `/video/hero/loop-${loop}.webp` };
}
