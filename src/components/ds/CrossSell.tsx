import Image from "next/image";
import Button from "./Button";

/**
 * Кросс-селл (03-template-service.md §1.11).
 *
 * Описание переносится 1:1: на 14 страницах из 17 это осмысленная связка услуг,
 * а не акция. Там, где в тексте сидела скидка, она по ТЗ уходит, и вместо неё
 * подставляется нейтральная строка «с этой услугой заказывают: N».
 */
interface CrossSellProps {
  title: string;
  text: string;
  href: string;
  image: string;
}

export default function CrossSell({ title, text, href, image }: CrossSellProps) {
  return (
    <div className="grid items-center gap-6 overflow-hidden rounded-xl border border-line bg-surface md:grid-cols-2">
      <div className="relative aspect-[16/10] md:aspect-auto md:h-full md:min-h-[240px]">
        <Image src={image} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
      </div>
      <div className="p-6 md:p-10">
        <h2 className="font-display text-h3 text-ink">{title}</h2>
        <p className="mt-3 text-body-sm text-ink-secondary">{text}</p>
        <Button href={href} variant="secondary" size="sm" className="mt-6">
          Подробнее
        </Button>
      </div>
    </div>
  );
}
