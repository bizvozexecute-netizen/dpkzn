import { readFileSync } from "node:fs";
import path from "node:path";
import Image from "next/image";

// Only these two published posters have a portrait crop. Keep the ordinary
// image pipeline for other services and for posters changed in the admin.
const portraits = new Map<string, string>();
for (const loop of [1, 3]) {
  const base = `/video/hero/loop-${loop}`;
  const bytes = readFileSync(path.join(process.cwd(), "public", `${base}-portrait-v1.webp`));
  portraits.set(`${base}.webp`, `data:image/webp;base64,${bytes.toString("base64")}`);
}

export default function HeroPoster({ src }: { src: string }) {
  const portrait = portraits.get(src);
  if (!portrait) return <Image src={src} alt="" fill priority fetchPriority="high" quality={80} sizes="100vw" className="object-cover" />;
  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={portrait} />
      {/* The mobile crop travels with the HTML. Desktop uses the original poster. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" decoding="sync" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
    </picture>
  );
}
