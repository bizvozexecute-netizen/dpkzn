# Lighthouse: выжимка 16 отчётов

Источник: локальные одиночные прогоны Lighthouse на изолированном сервере (тестовая БД). Полные HTML/JSON (≈29 МБ) в git не включены, здесь их выжимка; полная версия — `lighthouse-summary.json`.

| Прогон | URL | Perf | A11y | BP | SEO | LCP, мс | CLS | TBT, мс | JS, кБ | Всего, кБ | runtimeError |
|---|---|---|---|---|---|---|---|---|---|---|---|
| alarms-desktop | `/ustanovka-signalizacii` | 99 | 96 | 100 | 100 | 809 | 0.057 | 21 | 183 | 528 | нет |
| alarms-mobile | `/ustanovka-signalizacii` | 84 | 96 | 100 | 100 | 1724 | 0 | 632 | 177 | 281 | нет |
| article-desktop | `/blog/antidozhd-zachem-nuzhen` | 100 | 96 | 100 | 100 | 662 | 0 | 23 | 176 | 312 | нет |
| article-mobile | `/blog/antidozhd-zachem-nuzhen` | 96 | 96 | 100 | 100 | 2728 | 0 | 109 | 170 | 295 | нет |
| blog-desktop | `/blog` | 100 | 96 | 100 | 100 | 722 | 0.011 | 9 | 176 | 931 | нет |
| blog-mobile | `/blog` | 78 | 96 | 100 | 100 | 3087 | 0 | 639 | 170 | 383 | нет |
| case-desktop | `/portfolio/bmw-420d-detailing` | 100 | 96 | 100 | 100 | 795 | 0 | 20 | 179 | 418 | нет |
| case-mobile | `/portfolio/bmw-420d-detailing` | 90 | 96 | 100 | 100 | 2731 | 0 | 283 | 173 | 288 | нет |
| contacts-desktop | `/contacts` | 100 | 96 | 96 | 100 | 619 | 0 | 3 | 176 | 296 | нет |
| contacts-mobile | `/contacts` | 96 | 96 | 96 | 100 | 2508 | 0 | 143 | 168 | 212 | нет |
| home-desktop | `/` | 99 | 96 | 100 | 100 | 856 | 0 | 92 | 176 | 642 | нет |
| home-mobile | `/` | 95 | 96 | 100 | 100 | 2512 | 0.034 | 163 | 167 | 462 | нет |
| portfolio-desktop | `/portfolio` | 100 | 96 | 100 | 100 | 667 | 0 | 24 | 176 | 702 | нет |
| portfolio-mobile | `/portfolio` | 71 | 96 | 100 | 100 | 3560 | 0 | 853 | 170 | 676 | нет |
| service-desktop | `/ppf` | 83 | 96 | 100 | 100 | 754 | 0.348 | 32 | 183 | 827 | нет |
| service-mobile | `/ppf` | 88 | 96 | 100 | 100 | 2337 | 0 | 421 | 167 | 483 | нет |

## Аудиты со счётом < 0,9 (с ненулевым весом)

- **alarms-desktop**: accessibility:color-contrast
- **alarms-mobile**: performance:total-blocking-time (630 ms); accessibility:color-contrast
- **article-desktop**: accessibility:color-contrast
- **article-mobile**: performance:largest-contentful-paint (2.7 s); accessibility:color-contrast
- **blog-desktop**: accessibility:color-contrast
- **blog-mobile**: performance:largest-contentful-paint (3.1 s); performance:total-blocking-time (640 ms); accessibility:color-contrast
- **case-desktop**: accessibility:color-contrast
- **case-mobile**: performance:largest-contentful-paint (2.7 s); performance:total-blocking-time (280 ms); accessibility:color-contrast
- **contacts-desktop**: accessibility:color-contrast; best-practices:errors-in-console
- **contacts-mobile**: performance:largest-contentful-paint (2.5 s); accessibility:color-contrast; best-practices:errors-in-console
- **home-desktop**: accessibility:color-contrast
- **home-mobile**: performance:largest-contentful-paint (2.5 s); accessibility:color-contrast
- **portfolio-desktop**: accessibility:color-contrast
- **portfolio-mobile**: performance:largest-contentful-paint (3.6 s); performance:total-blocking-time (850 ms); accessibility:color-contrast
- **service-desktop**: performance:cumulative-layout-shift (0.348); accessibility:color-contrast
- **service-mobile**: performance:total-blocking-time (420 ms); accessibility:color-contrast
