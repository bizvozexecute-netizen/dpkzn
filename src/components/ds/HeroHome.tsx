import HeroPoster from "./HeroPoster";
import type { ReactNode } from "react";
import Button from "./Button";
import CountUp from "./CountUp";
import HeroLoop from "./HeroLoop";
import HeroLead from "@/components/redesign/HeroLead";
import type { CarClass } from "@/lib/types";
import { MessageCircle, Send, Star } from "./icons";

/**
 * Hero главной (03-template-home.md §2), переработан 23.09.2026.
 *
 * Владелец: «hero не продаёт, слишком много слов и цифр». В первом экране было
 * восемь смысловых элементов и ни одного поля телефона — единственная форма
 * жила на 8-м экране. Теперь в первом экране четыре вещи: заголовок, одна
 * строка выгоды, форма телефона и компактный ряд связи.
 *
 * Лид, бейджи и четыре цифры не удалены, а переехали во вторую секцию этого же
 * компонента — блок доверия сразу под первым экраном: гейт содержимого требует,
 * чтобы каждое слово страницы осталось на ней, перемещать можно.
 *
 * LCP — постер: next/image с priority. Форма — клиентский остров на месте
 * прежнего мини-старта квиза, второго острова не добавлено.
 */
interface HeroHomeProps {
  h1: string;
  lead: string;
  poster: string;
  videoBase: string | null;
  whatsappUrl: string;
  telegramUrl: string;
  maxUrl: string;
  carClasses: CarClass[];
  facts: { value: string; label: string }[];
  /** Рейтинг и число отзывов из блока доверия текущей главной */
  rating: string;
  reviewCount: number;
  /** Карточка на Яндекс Картах: рейтинг в первом экране ведёт туда */
  mapsUrl: string;
  badges: string[];
}

/** «1200+» → число и хвост, чтобы счётчик крутил только цифру. */
function splitValue(value: string): { number: number; suffix: string } | null {
  const m = value.match(/^(\d+)(.*)$/);
  return m ? { number: Number(m[1]), suffix: m[2] } : null;
}

/** Иконка мессенджера: на телефоне без подписи (ряд в одну строку), на
 *  планшете и шире — с подписью. Подпись остаётся в разметке и для гейта. */
function MessengerLink({ href, label, icon }: { href: string; label: string; icon?: ReactNode }) {
  return (
    <Button
      href={href}
      variant="messenger"
      aria-label={label}
      className="h-12 w-12 flex-shrink-0 gap-2 px-0 sm:w-auto sm:px-6 md:h-12"
      target="_blank"
      rel="noopener noreferrer"
    >
      {icon}
      {/* Без иконки подпись видна всегда: у Max нет своего значка, а пузырь
          WhatsApp рядом делал две кнопки неотличимыми (владелец 24.09) */}
      <span className={icon ? "hidden sm:inline" : "text-body-sm font-semibold"}>{label}</span>
    </Button>
  );
}

export default function HeroHome({
  h1,
  lead,
  poster,
  videoBase,
  whatsappUrl,
  telegramUrl,
  maxUrl,
  carClasses,
  facts,
  mapsUrl,
  badges,
}: HeroHomeProps) {
  return (
    <>
      <section data-compact-hero className="ds-fast-hero relative flex min-h-[520px] items-end overflow-hidden md:min-h-[720px]">
        <HeroPoster src={poster} />
        {/* Луп: десктоп — на весь hero после load; телефон — мобильный ре-кадр
            слоем сверху по первому жесту */}
        {videoBase && <HeroLoop src={videoBase} />}
        <div className="ds-hero-scrim absolute inset-0" />
        <span aria-hidden="true" className="studio-frame-label">01 / Полировка</span>

        <div className="ds-container relative w-full pb-6 pt-24 md:pb-16 md:pt-32">
          {/* Размер под ширину: на 360 px слово «Премиальный» токеном display-2
              (минимум 38 px) уходило за край экрана */}
          <h1
            className="max-w-[16ch] font-display text-display-2 text-ink"
            style={{ fontSize: "clamp(2.125rem, 1.33rem + 3.52vw, 4.5rem)" }}
          >
            {h1}
          </h1>

          <p
            className="mt-4 max-w-[40ch] text-body-lg text-ink"
            data-gate-new="одна строка выгоды вместо лида на 30 слов: лид переехал в блок доверия ниже (владелец 23.09.2026)"
          >
            Оклейка, полировка и защита кузова.
          </p>
          <div className="mt-5">
            <Button href="#photo-estimate" className="w-full sm:w-auto">Расчёт по фото</Button>
          </div>
          <details className="mt-2 max-w-[480px]">
            <summary className="ds-focus w-fit cursor-pointer py-3 text-body-sm text-ink underline">Другие способы связи</summary>
            <p className="mb-3 text-body-sm text-ink">Ответим в рабочее время.</p>
            <HeroLead source="hero:home" carClasses={carClasses} messengers={{ whatsappUrl, telegramUrl, maxUrl }} />
            <div className="mt-3 flex flex-wrap gap-2">
            <MessengerLink href={whatsappUrl} label="WhatsApp" icon={<MessageCircle size={20} className="flex-shrink-0 text-whatsapp" />} />
            <MessengerLink href={telegramUrl} label="Telegram" icon={<Send size={20} className="flex-shrink-0 text-telegram" />} />
            <MessengerLink href={maxUrl} label="Max" />
            </div>
          </details>
        </div>
      </section>

      {/* Блок доверия: всё, что раньше перегружало первый экран, — здесь,
          на втором. Читается уже тем, кто остался и выбирает. */}
      <section className="border-b border-line pb-12 pt-6 md:pb-20 md:pt-12">
        <div className="ds-container">
          <p className="max-w-[60ch] text-body text-ink-secondary md:text-body-lg">{lead}</p>
          <p className="mt-3 text-body-sm text-ink-tertiary">{badges.join(" · ")}</p>
          <p className="mt-3 max-w-[55ch] text-body-sm text-ink">
            Работаем с организациями. Принимаем оплату любыми способами.
          </p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ds-focus ds-nums mt-3 inline-flex items-center gap-1.5 rounded-sm text-body-sm text-ink-secondary transition-colors duration-150 hover:text-ink"
          >
            <Star size={15} filled className="text-star" />
            <span className="font-semibold text-ink">Отзывы на Яндекс Картах</span>
          </a>

          <ul
            className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 md:flex md:gap-14"
            data-gate-new="строка фактов: 1200+ авто, опыт с 2018 года, 97% рекомендаций, 100% фотоотчётов (ТЗ главной §2)"
          >
            {facts.map((f) => {
              const parsed = splitValue(f.value);
              return (
                <li key={f.label}>
                  <p className="ds-nums font-display text-stat text-ink">
                    {parsed ? <CountUp value={parsed.number} suffix={parsed.suffix} /> : f.value}
                  </p>
                  <p className="mt-1 max-w-[16ch] text-caption text-ink-secondary">{f.label}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}
