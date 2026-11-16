import type { Metadata } from "next";

/**
 * Служебный раздел: витрина компонентов дизайн-системы.
 * Не индексируется и не попадает в sitemap — это инструмент разработки,
 * а не страница сайта.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
