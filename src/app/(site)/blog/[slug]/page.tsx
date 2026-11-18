import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Breadcrumbs from "@/components/ds/Breadcrumbs";
import ArticleCard from "@/components/ds/ArticleCard";
import { ALARM_HUB_URL, getAlarmLandings } from "@/lib/db/queries/alarm";
import SeoProse from "@/components/ds/SeoProse";
import LeadFormSection from "@/components/ds/LeadFormSection";
import { getBlogPost, getBlogPosts } from "@/lib/db/queries/content";
import { getAllServices, getCarClassesForPricing } from "@/lib/db/queries/services";
import { getSettings } from "@/lib/db/queries/settings";
import { CATEGORY_SERVICE, readingMinutes, withAnchors } from "@/lib/redesign/blog";

/** Статьи по теме сигнализаций получают CTA-блок посадочных */
const ALARM_TOPIC_RX = /сигнализац|автозапуск|угон|прогрев двигател/i;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getBlogPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  const fullTitle = `${post.title} | Detailing Place`;
  const title = fullTitle.length <= 60 ? fullTitle : post.title;
  const description = post.excerpt || `Статья блога Detailing Place: ${post.title}.`;
  const url = `https://dpkzn.ru/blog/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      locale: "ru_RU",
      siteName: "Detailing Place",
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();
  const settings = getSettings();

  const url = `https://dpkzn.ru/blog/${slug}`;
  const imageUrl = post.image
    ? post.image.startsWith("http")
      ? post.image
      : `https://dpkzn.ru${post.image}`
    : "https://dpkzn.ru/images/og-default.webp";

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: imageUrl,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: "Detailing Place",
      url: "https://dpkzn.ru",
    },
    publisher: {
      "@type": "Organization",
      name: "Detailing Place",
      url: "https://dpkzn.ru",
      logo: {
        "@type": "ImageObject",
        url: "https://dpkzn.ru/images/logo-400.png",
        width: 400,
        height: 110,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
    ...(post.category ? { articleSection: post.category } : {}),
  };

  // Оглавление — только при 4+ H2 (ТЗ блога §2); якоря добавляются в готовый HTML
  const { html, toc } = withAnchors(post.content ?? "");
  const showToc = toc.length >= 4;
  const minutes = readingMinutes(post.content ?? post.excerpt);

  // CTA-компакт: услуга по категории статьи (ТЗ блога §4)
  const serviceHref = post.category ? CATEGORY_SERVICE[post.category] : undefined;
  const service = serviceHref
    ? getAllServices().find((s) => s.url === serviceHref)
    : undefined;
  const servicePrice = service?.packages[0]?.classPrices[0];

  // «Читайте также»: 3 статьи той же категории, при нехватке — свежие (ТЗ блога §5)
  const others = getBlogPosts().filter((p) => p.slug !== slug);
  const related = [
    ...others.filter((p) => p.category === post.category),
    ...others.filter((p) => p.category !== post.category),
  ].slice(0, 3);

  // Сезон сигнализаций: CTA только в статьях по теме (текст статьи не меняется)
  const alarmLandings = ALARM_TOPIC_RX.test(`${post.title} ${post.excerpt ?? ""} ${post.content ?? ""}`)
    ? getAlarmLandings()
    : [];

  const dateLabel = new Date(post.date).toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const tocList = (
    <ol className="space-y-2">
      {toc.map((item, i) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className="ds-focus flex gap-2.5 rounded-sm py-1 text-body-sm text-ink-secondary transition-colors duration-150 hover:text-ink"
          >
            <span className="ds-nums text-ink-tertiary">{String(i + 1).padStart(2, "0")}</span>
            {item.label}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article className="pb-8 pt-28 md:pt-40">
        <div className="ds-container">
          <div className="mx-auto max-w-[720px]">
            <Breadcrumbs
              items={[
                { label: "Блог", href: "/blog" },
                { label: post.title },
              ]}
              className="mb-6"
            />

            {post.category && <p className="text-overline uppercase text-accent">{post.category}</p>}
            {/* Кегль h2: заголовки статей длинные, на display-размере они
                разваливаются на пять строк */}
            <h1 className="mt-3 font-display text-h2 text-ink">{post.title}</h1>
            <p className="mt-4 text-body-sm text-ink-secondary">
              Detailing Place · {dateLabel}
              <span data-gate-new="время чтения в шапке статьи (ТЗ блога §1)"> · {minutes} мин чтения</span>
            </p>

            {post.image && (
              <div className="relative mt-8 aspect-video overflow-hidden rounded-lg border border-line">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 720px"
                  className="object-cover"
                  priority
                />
              </div>
            )}
          </div>

          <div className={showToc ? "mx-auto max-w-[720px] xl:mx-0 xl:grid xl:max-w-none xl:grid-cols-[280px_720px] xl:justify-center xl:gap-12" : "mx-auto max-w-[720px]"}>
            {showToc && (
              <div data-gate-new="оглавление статьи из её H2 (ТЗ блога §2)">
                {/* Мобайл и планшет: сворачиваемый блок */}
                <details className="mt-8 rounded-md border border-line bg-elevated p-5 xl:hidden">
                  <summary className="ds-focus cursor-pointer rounded-sm font-display text-h4 text-ink">
                    Содержание
                  </summary>
                  <div className="mt-4">{tocList}</div>
                </details>
                {/* Desktop ≥1280: sticky-колонка слева от текста */}
                <nav aria-label="Содержание статьи" className="hidden xl:sticky xl:top-24 xl:mt-10 xl:block xl:self-start">
                  <p className="text-overline uppercase text-ink-tertiary">Содержание</p>
                  <div className="mt-4">{tocList}</div>
                </nav>
              </div>
            )}

            <div className="mt-8 xl:mt-10">
              {html ? (
                <SeoProse html={html} />
              ) : (
                <SeoProse html={`<p>${post.excerpt}</p><p>Полное содержание статьи скоро появится. Подпишитесь на обновления в нашем Telegram.</p>`} />
              )}
            </div>
          </div>

          {/* CTA-компакт вместо формы: услуга по категории статьи */}
          {service && (
            <div
              id="quiz"
              className="mx-auto mt-12 max-w-[720px]"
              data-gate-new="CTA-компакт со ссылкой на услугу по категории статьи (ТЗ блога §4)"
            >
              <Link
                href={`${service.url}#quiz`}
                className="ds-focus group flex flex-wrap items-center gap-4 rounded-lg border border-line bg-elevated p-5 transition-colors duration-150 hover:border-line-strong md:gap-6 md:p-6"
              >
                <span className="relative hidden h-24 w-32 flex-shrink-0 overflow-hidden rounded-md sm:block">
                  <Image
                    src={`/images/hero/${service.slug}.webp`}
                    alt=""
                    fill
                    sizes="128px"
                    className="object-cover transition-transform duration-400 ease-out md:group-hover:scale-[1.06]"
                  />
                </span>
                <span className="min-w-[180px] flex-1">
                  <span className="block font-display text-h4 text-ink">
                    {service.h1.replace(/ в Казани.*/, "").replace(/ — .*/, "")}
                  </span>
                  {servicePrice && (
                    <span className="ds-nums mt-1 block text-body-sm text-ink-secondary">
                      от {servicePrice.replace(/^от\s*/i, "")}
                    </span>
                  )}
                </span>
                <span className="inline-flex h-11 flex-shrink-0 items-center rounded-pill bg-ink px-5 text-body-sm font-semibold text-bg transition-colors duration-250 group-hover:bg-accent-hover">
                  Расчёт по фото
                </span>
              </Link>
            </div>
          )}
        </div>
      </article>

      {alarmLandings.length > 0 && (
        <nav aria-labelledby="alarm-cta-title" className="ds-container max-w-3xl pb-10" data-gate-new="сезон сигнализаций: CTA в статьях по теме">
          <div className="rounded-xl border border-line bg-elevated p-5 md:p-8">
            <p id="alarm-cta-title" className="font-display text-h4 text-ink">Сигнализация и автозапуск</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              <li>
                <Link href={ALARM_HUB_URL} className="ds-focus inline-flex min-h-[44px] items-center rounded-pill border border-line px-4 text-body-sm text-ink hover:border-accent">
                  Цены на установку
                </Link>
              </li>
              {alarmLandings.map((l) => (
                <li key={l.slug}>
                  <Link href={l.url} className="ds-focus inline-flex min-h-[44px] items-center rounded-pill border border-line px-4 text-body-sm text-ink hover:border-accent">
                    {l.navLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}

      {/* Читайте также — перелинковка той же категории */}
      {related.length > 0 && (
        <section
          className="ds-section pt-10"
          data-gate-new="блок «Читайте также» — 3 статьи той же категории (ТЗ блога §5)"
        >
          <div className="ds-container">
            <h2 className="font-display text-h3 text-ink">Читайте также</h2>
            <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ArticleCard
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  title={p.title}
                  category={p.category}
                  image={p.image}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Статьи блога — 100% отказов (Метрика, сентябрь 2026): человек дочитал
          и ушёл, потому что оставить номер было негде. Форма в самом конце —
          для тех, кого статья убедила. */}
      <LeadFormSection
        source="page-bottom"
        gateNote="захват в конце статьи блога: у статей 100% отказов, оставить номер было негде (владелец 23.09.2026)"
        heading="Остались вопросы по своему автомобилю?"
        lead="Оставьте номер — мастер перезвонит, ответит на вопросы и назовёт цену."
        variant="expanded"
        carClasses={getCarClassesForPricing()}
        submitLabel="Перезвоните мне"
        submitLabelShort="Перезвоните"
        hint="Один звонок по вашему вопросу, без спама."
        messengers={{
          whatsappUrl: settings.whatsapp_url || "https://wa.me/79196449393",
          telegramUrl: settings.telegram_url || "https://t.me/+79196449393",
        }}
      />
    </>
  );
}
