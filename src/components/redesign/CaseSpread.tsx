import Image from "next/image";
import Link from "next/link";
import type { CaseSpreadData } from "@/lib/redesign/cases";
import Breadcrumbs from "@/components/ds/Breadcrumbs";
import ParallaxImg from "@/components/ds/ParallaxImg";
import Reveal from "@/components/ds/Reveal";

/**
 * Разворот флагманского кейса (03-template-portfolio.md §4, режим «разворот»).
 *
 * H1, услуга и теги — данные текущей страницы 1:1; вся история кейса приходит
 * из markdown и помечена data-gate-new: это новый контент, согласованный ТЗ.
 * Факт «срок» скрывается, пока владелец не заменил «[проверить: N дней]».
 */
interface CaseSpreadProps {
  data: CaseSpreadData;
  car: string;
  serviceName: string | null;
  tags: string[];
}

export default function CaseSpread({ data, car, serviceName, tags }: CaseSpreadProps) {
  const [task, ...rest] = data.sections;
  const processPhotos = data.photos.slice(1);
  const showDuration = data.duration !== "" && !data.duration.includes("[проверить");

  return (
    <>
      {/* Хедер-фото 21:9 со скримом */}
      <section className="relative flex min-h-[420px] items-end overflow-hidden md:aspect-[21/9] md:min-h-[520px]">
        <Image src={data.hero} alt={`${car} — ${serviceName ?? tags.join(", ")}`} fill priority quality={80} sizes="100vw" className="object-cover" />
        <div className="ds-hero-scrim absolute inset-0" />
        <div className="ds-container relative w-full pb-10 pt-28 md:pb-14">
          <Breadcrumbs items={[{ label: "Портфолио", href: "/portfolio" }, { label: car }]} className="mb-5" />
          {/* Заголовок кейса целиком, а не одна марка: «Audi» и «BMW X5» в H1
              Яндекс счёл малополезными — 10 из 11 работ выпали из индекса 20.09 */}
          <h1 className="font-display text-h1 text-ink">{data.title || car}</h1>
          {serviceName && <p className="mt-2 text-body md:text-body-lg text-ink-secondary">{serviceName}</p>}
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-pill border border-line bg-[rgba(10,10,12,0.5)] px-3 py-1.5 text-caption text-ink-secondary backdrop-blur-[8px]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <div data-gate-new="разворот флагманского кейса из docs/redesign/content/cases (ТЗ портфолио §4)">
        {/* Факты */}
        <section className="border-b border-line">
          <div className="ds-container flex flex-wrap gap-x-12 gap-y-4 py-6">
            {showDuration && (
              <div>
                <p className="text-overline uppercase text-ink-tertiary">Срок</p>
                <p className="ds-nums mt-1 text-body text-ink">{data.duration}</p>
              </div>
            )}
            {data.services.length > 0 && (
              <div>
                <p className="text-overline uppercase text-ink-tertiary">Пакет</p>
                <p className="mt-1 text-body text-ink">
                  {data.services.map((svc, i) => {
                    const href = data.serviceLinks[i];
                    return (
                      <span key={svc}>
                        {i > 0 && " + "}
                        {href ? (
                          <Link href={href} className="ds-focus rounded-sm underline decoration-line-strong underline-offset-4 hover:text-accent">
                            {svc}
                          </Link>
                        ) : (
                          svc
                        )}
                      </span>
                    );
                  })}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Задача: текст + фото */}
        {task && (
          <section className="ds-section">
            <div className="ds-container grid gap-8 lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-4">
                <h2 className="font-display text-h3 text-ink">{task.heading}</h2>
                {task.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)} className="mt-4 text-body text-ink-secondary">
                    {p}
                  </p>
                ))}
              </div>
              {data.photos[0] && (
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line lg:col-span-8 lg:aspect-auto lg:min-h-[420px]">
                  <ParallaxImg>
                    <Image src={data.photos[0]} alt={`${car} — ${task.heading}`} fill sizes="(max-width: 1024px) 100vw, 800px" className="object-cover" />
                  </ParallaxImg>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Процесс и результат */}
        {rest.map((section, si) => (
          <section key={section.heading} className="ds-section pt-0">
            <div className="ds-container">
              <div className="ds-prose-width">
                <h2 className="font-display text-h3 text-ink">{section.heading}</h2>
                {section.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)} className="mt-4 text-body text-ink-secondary">
                    {p}
                  </p>
                ))}
              </div>
              {si === 0 && processPhotos.length > 0 && (
                <div className="mt-8 grid grid-cols-2 gap-3 md:gap-4">
                  {processPhotos.map((src, i) => (
                    <Reveal key={src} delay={i * 80}>
                      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line">
                        <Image src={src} alt={`${car} — ${section.heading}, фото ${i + 1}`} fill sizes="(max-width: 768px) 50vw, 600px" className="object-cover" />
                      </div>
                    </Reveal>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
