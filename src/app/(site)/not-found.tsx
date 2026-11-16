import Button from "@/components/ds/Button";

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center pb-16 pt-28 md:pt-40">
      <div className="ds-container text-center">
        <p className="ds-nums font-display text-display-2 text-accent">404</p>
        <h1 className="mt-4 font-display text-h2 text-ink">Страница не найдена</h1>
        <p className="mx-auto mt-3 max-w-[44ch] text-body text-ink-secondary">
          Возможно, страница была перемещена или удалена. Перейдите на главную или выберите услугу из меню.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="primary" href="/">
            На главную
          </Button>
          <Button variant="secondary" href="/portfolio">
            Портфолио
          </Button>
        </div>
      </div>
    </section>
  );
}
