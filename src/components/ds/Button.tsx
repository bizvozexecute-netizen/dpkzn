"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Кнопка Dark Studio (ДС §4.1).
 *
 * Правило дозировки акцента: primary — максимум один на вьюпорт (sticky CTA не в счёт).
 * Hover не масштабирует кнопку — только цвет и свечение: скачок размера у элемента,
 * по которому целятся пальцем, сбивает попадание на мобильных.
 */

type Variant = "primary" | "secondary" | "ghost" | "messenger";
type Size = "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary: [
    // Слоновая кость с тёмным текстом — как у премиальных автобрендов на
    // чёрном; латунная шторка (ds-btn-shutter) заезжает под текст при hover.
    // Владелец 02.09: янтарные пилюли на каждом экране кричали.
    // Цвет текста — классом ds-btn-primary: text-bg терялся в tailwind-merge
    // (конфликт с text-body из SIZES), текст был белым на любом фоне
    "ds-btn-shutter ds-btn-primary bg-ink font-semibold",
    "hover:shadow-glow-accent",
    "active:shadow-none active:translate-y-px",
    "disabled:bg-surface2 disabled:text-ink-tertiary disabled:shadow-none disabled:translate-y-0",
  ].join(" "),
  secondary: [
    "bg-transparent text-ink border border-line-strong font-semibold",
    "hover:border-[rgba(var(--accent-rgb),0.4)]",
    "active:bg-accent-subtle active:translate-y-px",
    "disabled:border-line disabled:text-ink-tertiary",
  ].join(" "),
  ghost: [
    "bg-transparent text-ink-secondary font-medium",
    "hover:text-ink",
    "active:text-ink-secondary",
    "disabled:text-ink-tertiary",
  ].join(" "),
  messenger: [
    "bg-surface text-ink border border-line font-semibold",
    "hover:border-line-strong hover:bg-surface2",
    "active:translate-y-px",
    "disabled:text-ink-tertiary",
  ].join(" "),
};

const SIZES: Record<Size, string> = {
  md: "h-13 md:h-14 px-8 text-body",
  sm: "h-11 px-5 text-body-sm",
};

const BASE = [
  "inline-flex items-center justify-center gap-2 rounded-pill whitespace-nowrap",
  "transition-[background-color,border-color,color,box-shadow,transform] duration-250 ease-out",
  "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
  "disabled:pointer-events-none",
].join(" ");

interface CommonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = CommonProps & Omit<ComponentProps<"button">, "children" | "className"> & { href?: undefined };
type ButtonAsLink = CommonProps & Omit<ComponentProps<"a">, "children" | "className" | "href"> & { href: string };

export default function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "primary", size = "md", fullWidth, className, children, ...rest } = props;
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className);

  if ("href" in rest && rest.href) {
    const { href, ...anchorProps } = rest as ButtonAsLink;
    const external = href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:");
    if (href === "#photo-estimate") {
      return <button type="button" className={classes} onClick={() => window.dispatchEvent(new Event("ds:photo-estimate"))}>{children}</button>;
    }
    if (external || href.startsWith("#")) {
      return (
        <a href={href} className={classes} {...anchorProps} onClick={(event) => {
          anchorProps.onClick?.(event);
          if (!event.defaultPrevented && href === "#quiz" && !document.getElementById("quiz")) {
            event.preventDefault();
            window.location.assign("/#quiz");
          }
        }}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...anchorProps}>
        {children}
      </Link>
    );
  }

  const buttonProps = rest as Omit<ButtonAsButton, keyof CommonProps>;
  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
