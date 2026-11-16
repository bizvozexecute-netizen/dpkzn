import type { CarClass, ElementPrice, ServicePackage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check } from "./icons";
import { AddToQuizButton, ElementsToggle, PriceClassSelector } from "./PriceControls";

/** Пункт состава пакета: галочка вместо цветной точки — «входит», а не «внимание» */
function Feature({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("flex gap-2 text-caption text-ink-secondary", className)}>
      <Check size={14} className="mt-0.5 flex-shrink-0 text-ink-tertiary" />
      {text}
    </span>
  );
}

/**
 * Универсальный прайс под три модели ценообразования из инвентаризации §3.1
 * (матрица классов / пакеты «от N ₽» / одна позиция).
 *
 * Серверный компонент: таблица — самый большой кусок разметки на странице, и
 * её гидратация была главной статьёй в TBT. Клиентскими остались три островка
 * в PriceControls; какие ячейки показать на мобильном, решает CSS по
 * data-атрибуту на контейнере.
 *
 * Второе требование ТЗ — ОДИН экземпляр в DOM. Сейчас на сайте прайс отрисован
 * дважды (карточки пакетов и полная таблица), поисковик видит цены дважды.
 * Здесь таблица одна, мобильный вид получается из неё стилями.
 *
 * «Договорная» показываем как «по осмотру»: слово «договорная» читается как
 * «цену назовут по настроению».
 */

interface PriceTableProps {
  packages: ServicePackage[];
  carClasses: CarClass[];
  elementPrices?: ElementPrice[];
  /** Подсказка под селектором класса — переносится со старой страницы */
  classHint?: string;
  className?: string;
}

const NEGOTIABLE = "по осмотру";
const ELEMENTS_COLLAPSED = 8;

function priceLabel(value: string | null | undefined): string {
  if (!value) return NEGOTIABLE;
  if (/договорн|дог\./i.test(value)) return NEGOTIABLE;
  return value;
}

/** Цена карточки: «от » мелким, сумма — дисплейным кеглем. Видимый текст 1:1. */
function PriceValue({ value }: { value: string | null | undefined }) {
  const label = priceLabel(value);
  const m = label.match(/^от\s+(.+)$/);
  if (!m) return <>{label}</>;
  return (
    <>
      <span className="mr-1 align-[0.35em] font-sans text-body-sm font-normal text-ink-secondary">от </span>
      {m[1]}
    </>
  );
}

function PopularBadge({ className }: { className?: string }) {
  return (
    <span className={cn("rounded-pill bg-accent-subtle px-2 py-0.5 text-caption text-accent", className)}>
      Выбирают чаще
    </span>
  );
}

export default function PriceTable({
  packages,
  carClasses,
  elementPrices,
  classHint,
  className,
}: PriceTableProps) {
  const isMatrix = packages.some((p) => p.classPrices.length > 1);
  const elements = elementPrices ?? [];
  const elementHasClasses = elements.some((el) => el.classPrices.length > 1);

  return (
    <div className={cn("space-y-10", className)} data-price-root data-active-class="0" data-elements="collapsed">
      {isMatrix && (
        <div>
          <PriceClassSelector classes={carClasses} hint={classHint} />

          <div className="ds-price mt-6 md:mt-0 md:overflow-x-auto">
            {/* border-separate: подложка популярного пакета получает скругление
                по крайним ячейкам (у tr радиуса нет); разделители — на ячейках */}
            <table className="w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  <th scope="col" className="border-b border-line py-4 pr-6 text-caption font-normal text-ink-tertiary md:pl-4">
                    Пакет
                  </th>
                  {carClasses.map((cc) => (
                    <th key={cc.id} scope="col" className="border-b border-line px-4 py-4 align-bottom">
                      <span className="block text-caption font-medium text-ink">{cc.label}</span>
                      <span className="block text-caption font-normal text-ink-tertiary">{cc.example}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.name} data-popular={pkg.isPopular || undefined} className="group">
                    <th
                      scope="row"
                      className={cn(
                        "border-b border-line py-5 pr-6 align-top font-normal transition-colors duration-150 md:max-w-[340px] md:rounded-l-xl md:pl-4 md:group-hover:bg-surface",
                        // Популярный пакет — подложкой со скруглением, а не цветной рамкой
                        pkg.isPopular && "md:bg-surface",
                      )}
                    >
                      <span className="block font-display text-h4 text-ink">{pkg.name}</span>
                      {pkg.isPopular && <PopularBadge className="mt-2 inline-block" />}
                      {pkg.description && (
                        <span className="mt-1.5 block text-body-sm text-ink-secondary">{pkg.description}</span>
                      )}
                      {pkg.features.length > 0 && (
                        <span className="mt-3 block space-y-1">
                          {pkg.features.map((f) => (
                            <Feature key={f} text={f} />
                          ))}
                        </span>
                      )}
                      <AddToQuizButton packageName={pkg.name} />
                    </th>
                    {carClasses.map((cc, i) => (
                      <td
                        key={cc.id}
                        data-cls={i}
                        className={cn(
                          "ds-nums border-b border-line px-4 py-5 align-top text-body-lg font-medium text-ink transition-colors duration-150 md:group-hover:bg-surface",
                          i === carClasses.length - 1 && "md:rounded-r-xl md:pr-4",
                          pkg.isPopular && "md:bg-surface",
                        )}
                      >
                        {/* На мобиле — подпись класса над ценой (какую цену смотришь);
                            на десктопе класс в шапке колонки */}
                        <span className="mb-0.5 block text-caption font-normal text-ink-tertiary md:hidden">
                          {cc.label}
                        </span>
                        {priceLabel(pkg.classPrices[i])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Пакеты без классов и одна позиция */}
      {!isMatrix && (
        <div className={cn("grid gap-4", packages.length > 1 ? "md:grid-cols-3" : "max-w-xl")}>
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className={cn(
                "flex flex-col rounded-lg border bg-surface p-6",
                pkg.isPopular ? "border-line-strong" : "border-line",
              )}
            >
              {pkg.isPopular && <PopularBadge className="mb-3 self-start" />}
              <p className="font-display text-h4 text-ink">{pkg.name}</p>
              {pkg.description && <p className="mt-1 text-body-sm text-ink-secondary">{pkg.description}</p>}

              <p className="ds-nums mt-4 font-display text-price text-ink">
                <PriceValue value={pkg.classPrices[0]} />
              </p>

              {pkg.features.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {pkg.features.map((f) => (
                    <li key={f}>
                      <Feature text={f} className="text-body-sm" />
                    </li>
                  ))}
                </ul>
              )}

              <AddToQuizButton packageName={pkg.name} fullWidth />
            </div>
          ))}
        </div>
      )}

      {/* Поэлементный прайс. Та же таблица и та же адаптация, что и у пакетов:
          цены по классам — SEO-контент, показывать только выбранный класс можно,
          но выкидывать остальные из разметки нельзя. */}
      {elements.length > 0 && (
        <div className="ds-price ds-elements">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-4 pr-6 font-display text-h4 font-medium text-ink">
                  Поэлементный прайс
                </th>
                {elementHasClasses ? (
                  carClasses.map((cc) => (
                    <th key={cc.id} scope="col" className="px-4 py-4 text-caption font-medium text-ink-secondary">
                      {cc.label}
                    </th>
                  ))
                ) : (
                  <th scope="col" className="px-4 py-4 text-caption font-medium text-ink-secondary">
                    Цена
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {elements.map((el) => (
                <tr key={el.element} className="border-b border-line">
                  <th scope="row" className="py-3 pr-6 text-left text-body-sm font-normal text-ink">
                    {el.element}
                  </th>
                  {elementHasClasses ? (
                    carClasses.map((cc, ci) => (
                      <td
                        key={cc.id}
                        data-cls={ci}
                        className="ds-nums px-4 py-3 text-body-sm text-ink"
                      >
                        <span className="mr-1.5 text-caption text-ink-tertiary md:hidden">{cc.label}</span>
                        {priceLabel(el.classPrices[ci])}
                      </td>
                    ))
                  ) : (
                    <td className="ds-nums px-4 py-3 text-body-sm text-ink">
                      {priceLabel(el.classPrices[0])}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {elements.length > ELEMENTS_COLLAPSED && <ElementsToggle />}
        </div>
      )}

      <p className="text-body-sm text-ink-secondary">Точная цена — после осмотра или по фото</p>
    </div>
  );
}
