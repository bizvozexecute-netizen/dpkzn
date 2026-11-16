import { getCarClassesForPricing, getService, getServiceMenuItems } from "@/lib/db/queries/services";
import { getSettings } from "@/lib/db/queries/settings";
import { getVisibleReviews, getBlogPosts } from "@/lib/db/queries/content";
import { MEGAMENU_GROUPS } from "@/lib/redesign/nav-groups";
import Header, { type HeaderGroup } from "@/components/ds/Header";
import Footer from "@/components/ds/Footer";
import StickyCTA from "@/components/ds/StickyCTA";
import Button from "@/components/ds/Button";
import ServiceCard from "@/components/ds/ServiceCard";
import ArticleCard from "@/components/ds/ArticleCard";
import ReviewCard from "@/components/ds/ReviewCard";
import BeforeAfter from "@/components/ds/BeforeAfter";
import PriceTable from "@/components/ds/PriceTable";
import Quiz from "@/components/ds/Quiz";
import Faq from "@/components/ds/Faq";
import Breadcrumbs from "@/components/ds/Breadcrumbs";
import Reveal from "@/components/ds/Reveal";
import CountUp from "@/components/ds/CountUp";

/** Витрина дизайн-системы вместо Storybook: все компоненты во всех состояниях. */

function Block({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-12">
      <h2 className="font-display text-h3 text-ink">{title}</h2>
      {note && <p className="mt-2 max-w-[60ch] text-body-sm text-ink-secondary">{note}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

const SWATCHES = [
  ["bg", "bg-bg"],
  ["elevated", "bg-elevated"],
  ["surface", "bg-surface"],
  ["surface2", "bg-surface2"],
  ["accent", "bg-accent"],
  ["accent-subtle", "bg-accent-subtle"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["error", "bg-error"],
];

const TYPE_SCALE = [
  ["display-1", "text-display-1"],
  ["display-2", "text-display-2"],
  ["h1", "text-h1"],
  ["h2", "text-h2"],
  ["h3", "text-h3"],
  ["h4", "text-h4"],
];

export default function DevUIPage() {
  const settings = getSettings();
  const menuItems = getServiceMenuItems();
  const carClasses = getCarClassesForPricing();
  const reviews = getVisibleReviews().slice(0, 3);
  const posts = getBlogPosts().slice(0, 3);

  const bySlug = new Map(menuItems.map((i) => [i.slug, i]));
  const groups: HeaderGroup[] = MEGAMENU_GROUPS.map((g) => ({
    title: g.title,
    items: g.slugs.map((s) => bySlug.get(s)).filter((i): i is NonNullable<typeof i> => Boolean(i)),
  }));

  const infoNav = [
    { label: "Портфолио", href: "/portfolio" },
    { label: "О студии", href: "/about" },
    { label: "Блог", href: "/blog" },
    { label: "Контакты", href: "/contacts" },
  ];

  const phone = settings.phone || "+7 (919) 644-93-93";
  const phoneRaw = settings.phone_raw || "79196449393";
  const whatsappUrl = settings.whatsapp_url || "https://wa.me/79196449393";
  const telegramUrl = settings.telegram_url || "https://t.me/+79196449393";
  const maxUrl = settings.max_url || "https://max.ru/u/";

  // Три модели прайса из инвентаризации §3.1 на реальных данных
  const ppf = getService("ppf");
  const broneplenka = getService("broneplenka");
  const shumka = getService("shumoizolyaciya");

  return (
    <>
      <Header
        groups={groups}
        infoNav={infoNav}
        phone={phone}
        phoneRaw={phoneRaw}
        whatsappUrl={whatsappUrl}
        telegramUrl={telegramUrl}
        maxUrl={maxUrl}
      />

      <main className="ds-container pt-24 pb-24 md:pt-32">
        <p className="text-overline uppercase text-accent">Dark Studio</p>
        <h1 className="mt-3 font-display text-h1 text-ink">Витрина компонентов</h1>
        <p className="mt-4 max-w-[60ch] text-body text-ink-secondary">
          Все core-компоненты дизайн-системы во всех состояниях. Данные — из боевой БД, а не заглушки:
          так сразу видно, где реальные названия услуг и цены ломают вёрстку.
        </p>

        <Block title="Палитра" note="Один акцент на весь сайт. Смена варианта — четыре переменные в :root.">
          <div className="grid grid-cols-3 gap-4 md:grid-cols-5">
            {SWATCHES.map(([name, cls]) => (
              <div key={name}>
                <div className={`h-20 rounded-md border border-line ${cls}`} />
                <p className="mt-2 text-caption text-ink-secondary">{name}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-1">
            <p className="text-body text-ink">ink — основной текст, контраст 18.2:1</p>
            <p className="text-body text-ink-secondary">ink-secondary — вторичный, 6.1:1</p>
            <p className="text-h4 text-ink-tertiary">ink-tertiary — 3.9:1, только от 24px и декоративные подписи</p>
          </div>
        </Block>

        <Block title="Типографика" note="Display — Unbounded 500/600, текст — Inter. Крупные размеры через clamp.">
          <div className="space-y-4">
            {TYPE_SCALE.map(([name, cls]) => (
              <div key={name} className="flex flex-wrap items-baseline gap-4">
                <span className="w-24 flex-shrink-0 text-caption text-ink-secondary">{name}</span>
                <span className={`font-display text-ink ${cls}`}>Детейлинг в Казани</span>
              </div>
            ))}
            <div className="flex flex-wrap items-baseline gap-4">
              <span className="w-24 flex-shrink-0 text-caption text-ink-secondary">body</span>
              <span className="text-body text-ink">Полиуретановая защита кузова от сколов и реагентов</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-4">
              <span className="w-24 flex-shrink-0 text-caption text-ink-secondary">price</span>
              <span className="ds-nums font-display text-price text-ink">от 50 000 ₽</span>
            </div>
          </div>
        </Block>

        <Block title="Кнопки" note="Primary — максимум одна на вьюпорт. Hover меняет цвет и свечение, но не размер.">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Расчёт по фото за 15 минут</Button>
              <Button variant="secondary">Смотреть работы</Button>
              <Button variant="ghost">Показать все элементы</Button>
              <Button variant="messenger">WhatsApp</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Расчёт</Button>
              <Button size="sm" variant="secondary">
                В расчёт
              </Button>
              <Button disabled>Отключена</Button>
              <Button variant="secondary" disabled>
                Отключена
              </Button>
            </div>
            <div className="max-w-sm">
              <Button fullWidth>Во всю ширину (в формах)</Button>
            </div>
          </div>
        </Block>

        <Block title="Крошки" note="Видимые ссылки и BreadcrumbList из одного источника.">
          <Breadcrumbs items={[{ label: "Услуги", href: "/#services" }, { label: "Антигравийная плёнка (PPF) в Казани" }]} />
        </Block>

        <Block title="Карточка услуги" note="Вся карточка — одна ссылка. Ч/б фото насыщается на hover.">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {menuItems.slice(0, 4).map((item) => (
              <ServiceCard
                key={item.slug}
                href={item.href}
                title={item.label}
                priceFrom={item.priceFrom}
                image={`/images/hero/${item.slug}.webp`}
              />
            ))}
          </div>
        </Block>

        <Block title="Прайс — матрица классов" note="Модель A: пакеты × классы 1–5. На мобайле — сегмент-контрол класса.">
          {ppf && <PriceTable packages={ppf.packages} carClasses={carClasses} elementPrices={ppf.elementPrices} />}
        </Block>

        <Block title="Прайс — пакеты" note="Модель B: три тарифа «от N ₽». Кнопка «В расчёт» подставляет пакет в квиз.">
          {broneplenka && (
            <PriceTable
              packages={broneplenka.packages}
              carClasses={carClasses}
              elementPrices={broneplenka.elementPrices}
            />
          )}
        </Block>

        <Block title="Прайс — одна позиция" note="Модель C: крупная цена и состав работ.">
          {shumka && <PriceTable packages={shumka.packages} carClasses={carClasses} />}
        </Block>

        <Block title="До / после" note="Обе картинки загружены заранее. При появлении ручка один раз проезжает 50 → 62 → 50 %.">
          <BeforeAfter
            before="/images/ppf-before.webp"
            after="/images/ppf-after.webp"
            alt="Кузов до и после оклейки антигравийной плёнкой"
          />
        </Block>

        <Block title="Квиз" note="Единственная форма страницы. Телефон — на последнем шаге, канал ответа уходит в заявку.">
          <div id="quiz" className="max-w-2xl">
            <Quiz
              serviceSlug="ppf"
              serviceName="Антигравийная плёнка (PPF) в Казани"
              carClasses={carClasses}
              optionsTitle="Что оклеиваем?"
              multiple
              options={[
                { value: "Капот", label: "Капот" },
                { value: "Передний бампер", label: "Передний бампер" },
                { value: "Фары", label: "Фары" },
                { value: "Зеркала", label: "Зеркала" },
                { value: "Полная оклейка", label: "Полная оклейка", hint: "весь кузов" },
              ]}
              whatsappUrl={whatsappUrl}
              telegramUrl={telegramUrl}
            />
          </div>
        </Block>

        <Block title="FAQ" note="details/summary: ответы всегда в разметке, первый вопрос раскрыт.">
          {ppf && <Faq items={ppf.faq.slice(0, 4)} />}
        </Block>

        <Block title="Отзывы" note="Лента без автокарусели. Текст раскрывается на месте.">
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.map((r, i) => (
              <ReviewCard
                key={r.author + r.text.slice(0, 12)}
                id={`dev-review-${i}`}
                name={r.author}
                text={r.text}
                rating={r.rating}
                date={r.date}
                car={r.car}
                source={r.source}
              />
            ))}
          </div>
        </Block>

        <Block title="Карточка статьи" note="Featured — горизонтальная, фото 60%. Заголовок на hover подчёркивается, а не красится.">
          <div className="space-y-8">
            {posts[0] && (
              <ArticleCard
                featured
                href={`/blog/${posts[0].slug}`}
                title={posts[0].title}
                category={posts[0].category}
                date={posts[0].date}
                readingMinutes={6}
                image={posts[0].image}
              />
            )}
            <div className="grid gap-6 md:grid-cols-3">
              {posts.map((p) => (
                <ArticleCard
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  title={p.title}
                  category={p.category}
                  date={p.date}
                  readingMinutes={5}
                  image={p.image}
                />
              ))}
            </div>
          </div>
        </Block>

        <Block title="Появление и счётчики" note="Единственная анимация входа: opacity + translateY, один раз, через IntersectionObserver.">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { value: 1200, suffix: "+", label: "авто" },
              { value: 5, suffix: " лет", label: "студии" },
              { value: 97, suffix: "%", label: "рекомендаций" },
              { value: 100, suffix: "%", label: "фотоотчётов" },
            ].map((f, i) => (
              <Reveal key={f.label} delay={i * 80}>
                <p className="ds-nums font-display text-h2 text-ink">
                  <CountUp value={f.value} suffix={f.suffix} />
                </p>
                <p className="mt-1 text-caption text-ink-secondary">{f.label}</p>
              </Reveal>
            ))}
          </div>
        </Block>

        <Block title="Sticky CTA" note="Появляется после 1.5 вьюпорта, прячется у футера, на шаге контакта квиза и при поднятой клавиатуре.">
          <p className="text-body-sm text-ink-secondary">Прокрутите страницу — панель внизу справа (десктоп) или снизу (мобайл).</p>
        </Block>
      </main>

      <Footer
        services={menuItems}
        infoNav={infoNav}
        phone={phone}
        phoneRaw={phoneRaw}
        address={settings.address || ""}
        hours={settings.hours || ""}
        whatsappUrl={whatsappUrl}
        telegramUrl={telegramUrl}
        maxUrl={maxUrl}
      />

      <StickyCTA whatsappUrl={whatsappUrl} telegramUrl={telegramUrl} maxUrl={maxUrl} />
    </>
  );
}
