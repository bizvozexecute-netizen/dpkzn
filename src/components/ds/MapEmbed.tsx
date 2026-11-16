"use client";

import { useState } from "react";

/**
 * Яндекс-карта на /contacts (ТЗ contacts): iframe не грузится до клика —
 * виджет тянет ~1 МБ JS и убивал бы мобильный замер ради карты, которую
 * открывает меньшинство. До клика — статичная картинка Static API с пином;
 * если она не отдалась (лимиты API), остаётся адресная панель с кнопкой.
 */
interface MapEmbedProps {
  lat: string;
  lng: string;
  address: string;
}

export default function MapEmbed({ lat, lng, address }: MapEmbedProps) {
  const [live, setLive] = useState(false);
  const [imgOk, setImgOk] = useState(true);

  if (live) {
    return (
      <div className="aspect-video overflow-hidden rounded-lg border border-line lg:aspect-auto lg:h-full lg:min-h-[420px]">
        <iframe
          src={`https://yandex.ru/map-widget/v1/?ll=${lng}%2C${lat}&z=16&l=map&pt=${lng},${lat}`}
          width="100%"
          height="100%"
          frameBorder="0"
          allowFullScreen
          title="Карта Detailing Place"
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setLive(true)}
      aria-label={`Показать карту: ${address}`}
      className="ds-focus group relative block aspect-video w-full overflow-hidden rounded-lg border border-line bg-elevated text-left lg:aspect-auto lg:h-full lg:min-h-[420px]"
    >
      {imgOk && (
        // Статичная картинка вместо живого виджета: один запрос, ноль JS
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://static-maps.yandex.ru/1.x/?ll=${lng},${lat}&z=15&l=map&size=650,450&pt=${lng},${lat},pm2ywm`}
          alt=""
          loading="lazy"
          onError={() => setImgOk(false)}
          className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity duration-250 group-hover:opacity-100"
        />
      )}
      <span className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-[rgba(10,10,12,0.82)] p-4 backdrop-blur-[8px]">
        <span className="text-body-sm text-ink">{address}</span>
        <span className="inline-flex h-11 items-center rounded-pill bg-ink px-5 text-body-sm font-semibold text-bg">
          Показать карту
        </span>
      </span>
    </button>
  );
}
