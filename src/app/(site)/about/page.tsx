import type { Metadata } from "next";
import Image from "next/image";
import { getSettings, getStats } from "@/lib/db/queries/settings";
import { getAllServices, getCarClassesForPricing } from "@/lib/db/queries/services";
import { KEY_SERVICE_SLUGS } from "@/lib/redesign/quiz-presets";
import Breadcrumbs from "@/components/ds/Breadcrumbs";
import CountUp from "@/components/ds/CountUp";
import HomeQuizSection from "@/components/redesign/HomeQuizSection";

export const metadata: Metadata = {
  title: "О студии — детейлинг в Казани | Detailing Place",
  description: "Студия премиального детейлинга в Казани. Команда профессионалов, охраняемый бокс, оригинальные материалы.",
  openGraph: {
    title: "О студии — детейлинг в Казани | Detailing Place",
    description: "Студия премиального детейлинга в Казани. Команда профессионалов, охраняемый бокс, оригинальные материалы.",
    url: "https://dpkzn.ru/about",
  },
  alternates: { canonical: "https://dpkzn.ru/about" },
};

/** «1200+» → число и хвост, чтобы счётчик крутил только цифру. */
function splitValue(value: string): { number: number; suffix: string } | null {
  const m = value.match(/^(\d+)(.*)$/);
  return m ? { number: Number(m[1]), suffix: m[2] } : null;
}

/**
 * Фото-грид студии: собственные кадры — студия + работа в боксе.
 * Стока нет, поэтому и записей в content/photo-credits.md не требуется.
 */
const STUDIO_PHOTOS = [
  { src: "/images/studio-1.webp", alt: "Студия Detailing Place — рабочая зона", big: true },
  { src: "/images/studio-2.webp", alt: "Студия Detailing Place — зона ожидания", big: true },
  { src: "/images/portfolio/gallery/ppf-master-IMG_3888.webp", alt: "Мастер за оклейкой PPF в боксе студии", big: false },
  { src: "/images/portfolio/gallery/porsche-cayenne-IMG_4455.webp", alt: "Porsche Cayenne после полировки в студии", big: false },
  { src: "/images/portfolio/gallery/rolls-royce-IMG_3861.webp", alt: "Rolls-Royce Cullinan на оклейке в студии", big: false },
];

/** «Как мы работаем со студией» — спокойный текст без плашек (ТЗ about). */
const HOW_WE_WORK = [
  {
    title: "Оплатим такси",
    text: "При заказе от 15 000 ₽ дорога до студии и обратно — за наш счёт.",
  },
  {
    title: "Фотоотчёт каждого этапа",
    text: "Пока машина в боксе, вы видите процесс: фото до, во время и после работы.",
  },
  {
    title: "Гарантия на работы",
    text: "На материалы действует гарантия производителя, на работу — наша собственная.",
  },
];

export default function AboutPage() {
  const stats = getStats();
  const settings = getSettings();

  const all = getAllServices();
  const bySlug = new Map(all.map((s) => [s.slug, s]));
  const quizOptions = [
    ...KEY_SERVICE_SLUGS.map((slug) => bySlug.get(slug))
      .filter((s) => s !== undefined)
      .map((s) => {
        const title = s.h1.replace(/ в Казани.*/, "").replace(/ — .*/, "");
        return { value: title, label: title };
      }),
    { value: "Другое", label: "Другое" },
  ];

  return (
    <>
      {/* Хедер: H1 и манифест — тексты текущей страницы 1:1 */}
      <section className="pb-4 pt-28 md:pt-40">
        <div className="ds-container">
          <Breadcrumbs items={[{ label: "О студии" }]} className="mb-6" />
          <h1 className="max-w-[20ch] font-display text-h1 text-ink">О студии Detailing Place</h1>
          <blockquote className="mt-6 max-w-[56ch] text-body-lg text-ink-secondary">
            «Мы не просто клеим плёнку и полируем — мы создаём ощущение нового автомобиля.
            Каждый проект — это ответственность перед клиентом и репутацией.»
          </blockquote>
          <p className="mt-3 text-body-sm text-ink-tertiary">— Команда Detailing Place</p>
        </div>
      </section>

      {/* Цифры-факты с count-up */}
      <section className="py-10 md:py-14">
        <div className="ds-container">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-8 border-y border-line py-8 md:grid-cols-4 md:py-10">
            {stats.map((stat) => {
              const parsed = splitValue(stat.value);
              return (
                <li key={stat.label}>
                  <p className="ds-nums font-display text-stat text-ink">
                    {parsed ? <CountUp value={parsed.number} suffix={parsed.suffix} /> : stat.value}
                  </p>
                  <p className="mt-1 max-w-[18ch] text-caption text-ink-secondary">{stat.label}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Фото-грид студии */}
      <section className="ds-section pt-4">
        <div className="ds-container">
          <h2 className="font-display text-h2 text-ink">Наша студия</h2>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-4">
            {STUDIO_PHOTOS.map((photo) => (
              <div
                key={photo.src}
                className={
                  photo.big
                    ? "relative col-span-2 aspect-video overflow-hidden rounded-lg border border-line md:col-span-3"
                    : "relative aspect-[4/3] overflow-hidden rounded-lg border border-line md:col-span-2"
                }
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 640px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Как мы работаем — спокойный текст, без плашек и таймеров */}
      <section
        className="ds-section pt-0"
        data-gate-new="блок «Как мы работаем со студией»: такси, фотоотчёты, гарантия спокойным текстом (ТЗ about)"
      >
        <div className="ds-container">
          <h2 className="font-display text-h2 text-ink">Как мы работаем со студией</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
            {HOW_WE_WORK.map((item) => (
              <div key={item.title}>
                <h3 className="font-display text-h4 text-ink">{item.title}</h3>
                <p className="mt-2 text-body text-ink-secondary">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HomeQuizSection
        serviceSlug="about"
        title="Запишитесь на визит"
        lead="Покажем студию и рассчитаем стоимость"
        options={quizOptions}
        carClasses={getCarClassesForPricing()}
        whatsappUrl={settings.whatsapp_url || "https://wa.me/79196449393"}
        telegramUrl={settings.telegram_url || "https://t.me/+79196449393"}
      />
    </>
  );
}
