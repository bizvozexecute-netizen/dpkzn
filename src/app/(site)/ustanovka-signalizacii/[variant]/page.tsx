import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LeadForm from "@/components/ds/LeadForm";
import { getService, getCarClassesForPricing } from "@/lib/db/queries/services";

const pages = {
  avtozapusk: {
    title: "Установка сигнализации с автозапуском в Казани",
    intro: "Хотите зимой садиться в прогретый автомобиль? Подберём систему под вашу модель и проверим, как она будет работать со штатным ключом.",
    heading: "Что уточнить перед установкой",
    details: ["Назовите марку, модель, год выпуска и тип коробки передач. По этим данным мастер проверит варианты запуска.", "Расскажите, где обычно стоит машина. Если она далеко от дома, обсудим управление через приложение и доступность мобильной связи.", "До записи согласуем оборудование, стоимость монтажа и время, на которое нужно оставить автомобиль."],
    other: "Как выбрать охранную систему", href: "vybor-signalizacii",
  },
  "vybor-signalizacii": {
    title: "Подбор охранной системы для автомобиля в Казани",
    intro: "Нужны уведомления об ударе, контроль автомобиля со смартфона или дистанционный запуск? Расскажите, что важно именно вам, и мастер предложит подходящую комплектацию.",
    heading: "За какие функции стоит платить",
    details: ["Для стоянки рядом с домом обсудим базовую охрану и оповещения. Для машины на удалённой парковке — связь через GSM.", "Если нужен контроль местоположения, уточним наличие спутникового модуля и условия связи выбранного комплекта.", "Сравним варианты с учётом штатной охраны вашего автомобиля. Стоимость оборудования и работ согласуем до монтажа."],
    other: "Подробнее про зимний автозапуск", href: "avtozapusk",
  },
} as const;

type Params = {params: Promise<{variant:string}>};
function getPage(slug:string) {
  if (slug !== "avtozapusk" && slug !== "vybor-signalizacii") notFound();
  return pages[slug];
}
export const dynamic = "force-dynamic";
export async function generateMetadata({params}:Params):Promise<Metadata> {
  const {variant}=await params, page=getPage(variant);
  return {title:page.title, description:page.intro, alternates:{canonical:"/ustanovka-signalizacii/"+variant}};
}
export default async function AlarmLanding({params}:Params) {
  const {variant}=await params, page=getPage(variant);
  if (!getService("ustanovka-signalizacii")?.isActive) notFound();
  return <section className="ds-container max-w-4xl pb-20 pt-28">
    <Link className="text-body-sm underline" href="/ustanovka-signalizacii">Сигнализации · услуги и цены</Link>
    <h1 className="mt-5 font-display text-h1 text-ink">{page.title}</h1>
    <p className="mt-4 max-w-2xl text-body-lg">{page.intro}</p>
    <div className="mt-6 max-w-xl rounded-lg bg-surface p-5"><LeadForm source={"alarm:"+variant} service={page.title} gateNote="Сезонный подбор сигнализации" carClasses={getCarClassesForPricing()} carOptional title="Узнайте стоимость для вашего автомобиля" submitLabel="Запросить подбор" hint="Мастер перезвонит в рабочее время и уточнит комплектацию." /></div>
    <h2 className="mt-12 font-display text-h2">{page.heading}</h2>
    <ul className="mt-5 list-disc space-y-4 pl-5">{page.details.map(s=><li key={s}>{s}</li>)}</ul>
    <p className="mt-8">Работаем в Казани с 2018 года. Принимаем заказы от организаций.</p>
    <Link className="mt-5 inline-block underline" href={"/ustanovka-signalizacii/"+page.href}>{page.other}</Link>
  </section>;
}
