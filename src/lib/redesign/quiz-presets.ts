import type { ServicePackage } from "@/lib/types";

/**
 * Конфиг второго шага квиза на услугу (03-template-service.md §5).
 *
 * Общее правило: для матрицы и пакетов выбираем из того же прайса, что на
 * странице — иначе человек считает одно, а видит другое. Для одной позиции
 * шаг пропускается: выбирать не из чего.
 *
 * /ppf — исключение по ТЗ §4: там шаг 2 это зоны кузова, они же синхронизированы
 * с «Анатомией». Значения — id зон из public/anatomy/anatomy.json, подписи —
 * оттуда же, поэтому клик по машине и галочка в списке меняют одно состояние.
 */

export interface QuizOptionConfig {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Восемь ключевых услуг (03-template-home.md §5) — сетка главной и шаг
 * «что делаем» generic-квиза на главной, в портфолио и кейсах.
 */
export const KEY_SERVICE_SLUGS = [
  "ppf",
  "polirovka",
  "himchistka",
  "tonirovka",
  "ustanovka-linz",
  "broneplenka",
  "shumoizolyaciya",
  "detayling-kuzova",
] as const;

export interface QuizPreset {
  title: string;
  multiple: boolean;
  /** Показывать кнопку «Показать на машине» с оверлеем «Анатомии» */
  anatomy: boolean;
  options: QuizOptionConfig[];
}

const PPF_ZONES: QuizOptionConfig[] = [
  { value: "hood", label: "Капот" },
  { value: "front_bumper", label: "Передний бампер" },
  { value: "headlights", label: "Фары" },
  { value: "windshield", label: "Лобовое стекло" },
  { value: "front_fenders", label: "Передние крылья" },
  { value: "front_doors", label: "Передние двери" },
  { value: "rear_doors", label: "Задние двери" },
  { value: "rockers", label: "Пороги" },
  { value: "roof", label: "Крыша" },
  { value: "rear_quarter", label: "Задние крылья" },
  { value: "tailgate", label: "Крышка багажника" },
  { value: "rear_bumper", label: "Задний бампер" },
  { value: "wheels", label: "Диски и арки" },
];

export function getQuizPreset(slug: string, packages: ServicePackage[]): QuizPreset {
  if (slug === "ppf") {
    return { title: "Что оклеиваем?", multiple: true, anatomy: true, options: PPF_ZONES };
  }

  if (packages.length > 1) {
    return {
      title: "Что делаем?",
      multiple: false,
      anatomy: false,
      options: packages.map((p) => ({ value: p.name, label: p.name, hint: p.description || undefined })),
    };
  }

  return { title: "Что делаем?", multiple: false, anatomy: false, options: [] };
}
