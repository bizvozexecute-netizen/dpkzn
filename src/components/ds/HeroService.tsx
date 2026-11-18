import HeroPoster from "./HeroPoster";
import Breadcrumbs, { type Crumb } from "./Breadcrumbs";
import Button from "./Button";
import HeroLead from "@/components/redesign/HeroLead";
import type { CarClass } from "@/lib/types";
import HeroLoop from "./HeroLoop";

/**
 * Hero страницы услуги (03-template-service.md §1.2).
 *
 * LCP — постер: next/image с priority, видео подключается отдельным клиентским
 * слоем уже после загрузки. Так тяжёлый луп не соревнуется с первым экраном
 * за сеть, а на медленном соединении и при reduced-motion его просто нет.
 */
interface HeroServiceProps {
  /** Короткий факт над H1 — бейдж услуги со старого hero */
  overline?: string | null;
  h1: string;
  lead: string;
  usp: string[];
  poster: string;
  videoBase: string | null;
  /** Якорь блока с работами или /portfolio */
  worksHref: string;
  photoFirst?: boolean;
  /** Классы авто для подбора в форме первого экрана */
  carClasses: CarClass[];
  /** Мессенджеры на экране «заявка принята» */
  messengers: { whatsappUrl: string; telegramUrl: string; maxUrl?: string };
  /** Источник заявки из первого экрана; по умолчанию — первый экран услуги */
  leadSource?: "hero:service" | "antikor-bridge";
  /** Цепочка крошек; по умолчанию — Главная › H1 */
  crumbs?: Crumb[];
  /** Замена формы первого экрана (посадочные с одной формой ниже) */
  leadSlot?: React.ReactNode;
}

export default function HeroService({
  overline,
  h1,
  lead,
  usp,
  poster,
  videoBase,
  worksHref,
  photoFirst = false,
  carClasses,
  messengers,
  leadSource = "hero:service",
  crumbs,
  leadSlot,
}: HeroServiceProps) {
  return (
    <section data-compact-hero={photoFirst || undefined} className="ds-fast-hero relative flex min-h-[520px] items-end overflow-hidden md:min-h-[620px]">
      <HeroPoster src={poster} />
      {videoBase && <HeroLoop src={videoBase} />}
      <div className="ds-hero-scrim absolute inset-0" />
        {photoFirst && <span aria-hidden="true" className="studio-frame-label">02 / Оклейка</span>}

      <div className="ds-container relative w-full pb-12 pt-28 md:pb-16 md:pt-32">
        {!photoFirst && <Breadcrumbs items={crumbs ?? [{ label: h1 }]} className="mb-6" />}

        {!photoFirst && overline && <p className="mb-3 text-overline uppercase text-accent">{overline}</p>}
        <h1 className="max-w-[18ch] font-display text-h1 text-ink">{h1.replace(/автосигнализации/gi, word => word.slice(0, 4) + "\u00ad" + word.slice(4))}</h1>
        {/* Полный контраст, не ink-secondary: на светлых постерах (диски, хром)
            серый лид пропадал в фото, а на странице-мосте антикора он и есть
            главное сообщение. Тень — страховка на самых ярких кадрах. */}
        <p className="mt-5 max-w-[52ch] text-body-lg text-ink [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">{photoFirst ? "Защитим от сколов весь кузов или только зоны риска." : lead}</p>

        {!photoFirst && usp.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {usp.map((item) => (
              <li key={item} className="flex items-center gap-2 text-body-sm text-ink">
                <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-pill bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        )}

        {/* Главное действие — телефон (владелец 23.09.2026). Встаёт на место
            мини-старта квиза: остров заменён, а не добавлен. Название услуги
            уходит в заявку — мастер знает, о чём звонок. */}
        {!photoFirst && leadSlot}
        {!photoFirst && !leadSlot && <HeroLead source={leadSource} carClasses={carClasses} service={h1} messengers={messengers} />}

        {/* Вторичные пути в одну строку: столбиком на телефоне они добавляли
            первому экрану ещё 100 px */}
        {!leadSlot && <div className="mt-5 flex flex-wrap gap-2 sm:gap-3">
          {/* На телефоне обе подписи целиком не влезают в 360 px — короткие
              показываются там, полные остаются в разметке */}
          <Button href="#photo-estimate" variant={photoFirst ? "primary" : "secondary"} className="h-12 min-w-max flex-1 px-3 text-body-sm sm:flex-none sm:px-6 md:h-12">
            <span className="sm:hidden">Расчёт по фото</span>
            <span className="hidden sm:inline">Расчёт по фото</span>
          </Button>
          <Button href={worksHref} variant="ghost" className="h-12 flex-shrink-0 px-3 text-body-sm sm:px-6 md:h-12">
            <span className="sm:hidden">Работы</span>
            <span className="hidden sm:inline">Смотреть работы</span>
          </Button>
        </div>}
        {photoFirst && (
          <details className="mt-2 max-w-[480px]">
            <summary className="ds-focus w-fit cursor-pointer py-3 text-body-sm text-ink underline">Подробнее об оклейке и связи</summary>
            <p className="my-3 text-body text-ink">{lead}</p>
            <ul className="mb-4 list-disc pl-5 text-body-sm text-ink">{usp.map(item => <li key={item}>{item}</li>)}</ul>
            <HeroLead source={leadSource} carClasses={carClasses} service={h1} messengers={messengers} />
          </details>
        )}
      </div>
    </section>
  );
}
