import { cn } from "@/lib/utils";

/**
 * SEO-текст страницы (03-template-service.md §1.9). HTML переносится 1:1,
 * меняется только типографика: колонка 720px, заголовки font-display,
 * ссылки подчёркнуты и подсвечиваются акцентом на hover.
 */
interface SeoProseProps {
  html: string;
  className?: string;
}

export default function SeoProse({ html, className }: SeoProseProps) {
  return (
    <div
      className={cn(
        "ds-prose-width",
        // [&_h2:first-child], не first:[&_h2]: второе компилировалось в «:first-child h2»
        // и снимало верхний отступ у ВСЕХ заголовков — они липли к абзацам (аудит 02.09)
        "[&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-h3 [&_h2]:text-ink [&_h2:first-child]:mt-0",
        "[&_h3]:mt-8 [&_h3]:font-display [&_h3]:text-h4 [&_h3]:text-ink",
        "[&_p]:mt-4 [&_p]:text-body [&_p]:text-ink-secondary",
        "[&_ul]:mt-4 [&_ul]:space-y-2 [&_li]:text-body [&_li]:text-ink-secondary [&_li]:list-disc [&_ul]:pl-5",
        "[&_ol]:mt-4 [&_ol]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_strong]:text-ink",
        "[&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-line-strong [&_a]:transition-colors [&_a]:duration-150 hover:[&_a]:text-accent hover:[&_a]:decoration-[rgba(var(--accent-rgb),0.5)]",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
