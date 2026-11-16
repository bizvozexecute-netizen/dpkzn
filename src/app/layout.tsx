import type { Metadata, Viewport } from "next";
import { Inter, Unbounded } from "next/font/google";
import "@/styles/globals.css";

// Веса не перечисляем: обе гарнитуры вариативные, и список весов заставляет
// next/font качать по статическому файлу на каждый вес. Было пять файлов на
// 232 КБ, стало два вариативных — это главный вклад в задержку отрисовки.
const inter = Inter({
  subsets: ["cyrillic"],
  variable: "--font-inter",
  display: "optional",
  preload: false,
});

// Дисплейный шрифт Dark Studio (ДС §3). Только два веса и только заголовки —
// Unbounded широкий и характерный, в теле текста он нечитаем.
// Let the poster and first-screen styles load ahead of optional typefaces.
const unbounded = Unbounded({
  subsets: ["cyrillic"],
  variable: "--font-unbounded",
  display: "optional",
  preload: false,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Detailing Place — Премиальный детейлинг в Казани",
  description:
    "Антигравийная плёнка, полировка, керамика, тонировка, шумоизоляция, Bi-LED линзы. Премиальный автодетейлинг в Казани.",
  openGraph: {
    title: "Detailing Place — Премиальный детейлинг в Казани",
    description:
      "Антигравийная плёнка, полировка, керамика, тонировка, шумоизоляция, Bi-LED линзы. Премиальный автодетейлинг в Казани.",
    url: "https://dpkzn.ru",
    siteName: "Detailing Place",
    locale: "ru_RU",
    type: "website",
  },
  alternates: {
    canonical: "https://dpkzn.ru",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  metadataBase: new URL("https://dpkzn.ru"),
  verification: {
    yandex: "533c7acbe681d96d",
    google: "1UZieVrHK58CGZYBo9dl9Y4-kNQtH64Pvy77VS_MKw4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${unbounded.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
