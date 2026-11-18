# Browser environment recheck, 2026-11-17
This is an evidence handoff, not final acceptance.

Chromium 145 / Playwright 1.58.2 launches in repaired Studio agent image without network or browser downloads.
An actual full local page audit is running. Its log: .studio-tmp/browser-repair/audit.log; final structured output: .studio-tmp/browser-repair/audit.json; saved images: docs/audit/screens.
Lighthouse mobile on local homepage completed: performance 97, accessibility 96, best practices 100, SEO 100; LCP 2460ms, CLS 0, TBT 82ms.
Evidence: .studio-tmp/browser-repair/lighthouse-mobile.report.json and .html.
This is a lab measurement of local fixture data in an isolated container, not field performance of production.
The desktop Lighthouse attempt timed out; rerun without concurrent audit load before drawing conclusions.
Forms in audit.mjs are intercepted. Container has no external network; no CRM/Telegram submission.
Review the actual final JSON for incomplete form steps, console errors and missing fixtures. Do not claim all criteria passed because screenshots now work. Previous limitation 'cannot obtain screenshots or Lighthouse' is superseded by these artifacts.

## Completed browser pass

225 viewport checks across 76 distinct requested paths; 288 JPEG screenshots. No top-level horizontal overflow and no browser-runner errors in this pass. 404 responses are the intentionally missing page and /portfolio/null from local fixtures. The fixtures do not represent the full production database.

28 form checks reached intercepted test submissions. These are UI checks with mocked success, not evidence of CRM delivery.

The corrected complete quiz test passed all six cases: home, PPF, polishing at 375 and 1440. Each reached the contact step and visible confirmation, with one intercepted submission. Evidence: .studio-tmp/browser-repair/quiz.json and screens-quiz-*.png. It uses manual vehicle-class selection; car-model search requires its own check.

Desktop Lighthouse through the final shared wrapper completed with no runtime error: performance 100, accessibility 96, best practices 100, SEO 100. Evidence: .studio-tmp/browser-repair/lighthouse-desktop-final.report.json/.html.

## Measurements for independent review

| Path | Widths | Small tap targets (maximum) | Low-contrast text candidates (maximum) |
|---|---|---:|---:|
| / | 320, 375, 414, 768, 1440 | 29 | 27 |
| /ppf | 320, 375, 414, 768, 1440 | 26 | 18 |
| /polirovka | 320, 375, 414, 768, 1440 | 26 | 9 |
| /himchistka | 320, 375, 414, 768, 1440 | 26 | 9 |
| /shumoizolyaciya | 320, 375, 414, 768, 1440 | 26 | 3 |
| /antihrom | 320, 375, 414, 768, 1440 | 26 | 3 |
| /tonirovka | 320, 375, 414, 768, 1440 | 26 | 9 |
| /ustanovka-linz | 320, 375, 414, 768, 1440 | 26 | 3 |
| /regulirovka-far | 320, 375, 414, 768, 1440 | 26 | 3 |
| /polirovka-stekol | 320, 375, 414, 768, 1440 | 26 | 3 |
| /polirovka-far | 320, 375, 414, 768, 1440 | 26 | 3 |
| /antidozhd | 320, 375, 414, 768, 1440 | 26 | 3 |
| /remont-vmyatin | 320, 375, 414, 768, 1440 | 26 | 3 |
| /zashchitnye-pokrytiya | 320, 375, 414, 768, 1440 | 26 | 3 |
| /ustanovka-signalizacii | 320, 375, 414, 768, 1440 | 28 | 3 |
| /broneplenka | 320, 375, 414, 768, 1440 | 26 | 3 |
| /oklejka-avto | 320, 375, 414, 768, 1440 | 26 | 3 |
| /detayling-kuzova | 320, 375, 414, 768, 1440 | 26 | 3 |
| /vyezdnoj-detayling | 320, 375, 414, 768, 1440 | 26 | 3 |
| /antikor | 320, 375, 414, 768, 1440 | 27 | 1 |
| /ustanovka-signalizacii/avtozapusk | 320, 375, 414, 768, 1440 | 27 | 2 |
| /ustanovka-signalizacii/vybor-signalizacii | 320, 375, 414, 768, 1440 | 27 | 2 |
| /portfolio | 320, 375, 414, 768, 1440 | 25 | 15 |
| /portfolio/null | 320, 375, 414, 768, 1440 | 24 | 1 |
| /portfolio/lamborghini-urus-ppf | 375, 1440 | 25 | 5 |
| /portfolio/rolls-royce-cullinan-ppf | 375, 1440 | 25 | 6 |
| /portfolio/porsche-cayenne-polish | 375, 1440 | 25 | 6 |
| /portfolio/bmw-420d-detailing | 375, 1440 | 25 | 5 |
| /portfolio/mercedes-gla-polish | 375, 1440 | 25 | 5 |
| /portfolio/porsche-cayenne-coupe-ppf | 375, 1440 | 25 | 6 |
| /portfolio/toyota-camry-toning | 375, 1440 | 25 | 5 |
| /portfolio/audi-detailing | 375, 1440 | 25 | 5 |
| /portfolio/bmw-x5-ppf | 375, 1440 | 25 | 6 |
| /portfolio/mercedes-interior | 375, 1440 | 25 | 6 |
| /portfolio/ppf-process-hands | 375, 1440 | 25 | 5 |
| /portfolio/ppf-process-master | 375, 1440 | 25 | 4 |
| /blog | 320, 375, 414, 768, 1440 | 24 | 1 |
| /blog/antidozhd-zachem-nuzhen | 320, 375, 414, 768, 1440 | 28 | 8 |
| /blog/antihrom-pokraska-ili-plenka | 320, 375, 414, 768, 1440 | 28 | 8 |
| /blog/atermalnaya-plenka-kazan | 375 | 5 | 7 |
| /blog/bi-led-aozoom-vs-gtr-vs-hella | 375 | 6 | 7 |
| /blog/bi-led-linzy-guide | 375 | 7 | 7 |
| /blog/chastichnaya-polnaya-oklejka | 375 | 7 | 7 |
| /blog/chto-takoe-detayling | 375 | 6 | 7 |
| /blog/comfort-mat-vs-stp | 375 | 6 | 7 |
| /blog/detayling-porsche-cayenne | 375 | 6 | 7 |
| /blog/gologrammy-na-lkp | 375 | 4 | 7 |
| /blog/himchistka-salona-sovety | 375 | 2 | 3 |
| /blog/kak-vybrat-ppf-llumar-suntek | 375 | 2 | 3 |
| /blog/kak-vybrat-ppf-plenku | 375 | 7 | 7 |
| /blog/keramika-9h-vs-zhidkoe-steklo | 375 | 2 | 3 |
| /blog/keramika-na-broneplenku | 375 | 3 | 7 |
| /blog/kogda-ne-delat-polirovku | 375 | 7 | 8 |
| /blog/matovaya-plenka-na-avto-uhod | 375 | 5 | 7 |
| /blog/mify-pro-detayling | 375 | 4 | 8 |
| /blog/oklejka-vinil-ili-bronirovanie | 375 | 4 | 7 |
| /blog/podgotovka-avto-k-prodazhe | 375 | 3 | 3 |
| /blog/ppf-na-novuyu-mashinu | 375 | 2 | 3 |
| /blog/regulirovka-far-stend | 375 | 4 | 7 |
| /blog/semnaya-tonirovka | 375 | 5 | 7 |
| /blog/shumka-na-poderzhannoe-avto | 375 | 2 | 3 |
| /blog/shumka-svoimi-rukami | 375 | 4 | 8 |
| /blog/shumoizolyaciya-mify | 375 | 3 | 8 |
| /blog/skolko-sluzhit-ppf-plenka | 375 | 2 | 3 |
| /blog/stoimost-okleyki-avto-plenkoy | 375 | 7 | 8 |
| /blog/tonirovka-premium-avto | 375 | 5 | 7 |
| /blog/tonirovka-procenty | 375 | 7 | 7 |
| /blog/uhod-za-ppf-posle-okleyki | 375 | 6 | 8 |
| /blog/vesennij-detayling | 375 | 7 | 9 |
| /blog/zachem-nuzhna-keramika | 375 | 6 | 7 |
| /blog/zashchita-porogov-avto-plenkoy | 375 | 4 | 8 |
| /about | 320, 375, 414, 768, 1440 | 25 | 4 |
| /contacts | 320, 375, 414, 768, 1440 | 24 | 4 |
| /privacy | 320, 375, 414, 768, 1440 | 24 | 1 |
| /eta-stranica-ne-sushchestvuet | 320, 375, 414, 768, 1440 | 24 | 1 |
| /dev/ui | 375 | 1 | 15 |

Contrast scan is heuristic (solid ancestor backgrounds); validate candidates visually before treating every candidate as a defect. Raw DOM measurements and screenshots remain available. Do not count repeated /portfolio/null fixture entries as separate public pages.

Remaining audit work: reconcile findings with docs/redesign/03-*.md and existing top-15, test lightbox/menu/filter interactions and traffic-entry scenarios explicitly, distinguish fixture limitations from production, and independently review the final report. Do not mark the task accepted solely on these new browser results.

## Additional operator verification in progress
Lighthouse mobile+desktop across eight templates is running in a separate isolated container on local port 3120. Artifacts and explicit exit statuses: .studio-tmp/browser-repair/lighthouse-matrix/. Do not mark complete until all 16 JSON reports exist with runtimeError absent.
Actual UI-to-local-server-to-isolated-lead-database checks are also running (not mocked success), with CRM and Telegram disabled and network none. Artifacts: .studio-tmp/browser-repair/forms-e2e.json, forms-e2e.log, forms-e2e-server.log, forms-e2e-screens/. Each result records submissions and persistedLeadDelta. A success message alone is insufficient if persistedLeadDelta is zero. This does not test production delivery.

## Completed Lighthouse template matrix
16/16 reports completed with runtimeError absent. Local isolated lab measurements, not production field data. Full JSON/HTML in .studio-tmp/browser-repair/lighthouse-matrix/.
| Report | Performance | Accessibility | Best practices | SEO |
|---|---:|---:|---:|---:|
| alarms-desktop.report.json | 99 | 96 | 100 | 100 |
| alarms-mobile.report.json | 84 | 96 | 100 | 100 |
| article-desktop.report.json | 100 | 96 | 100 | 100 |
| article-mobile.report.json | 96 | 96 | 100 | 100 |
| blog-desktop.report.json | 100 | 96 | 100 | 100 |
| blog-mobile.report.json | 78 | 96 | 100 | 100 |
| case-desktop.report.json | 100 | 96 | 100 | 100 |
| case-mobile.report.json | 90 | 96 | 100 | 100 |
| contacts-desktop.report.json | 100 | 96 | 96 | 100 |
| contacts-mobile.report.json | 96 | 96 | 96 | 100 |
| home-desktop.report.json | 99 | 96 | 100 | 100 |
| home-mobile.report.json | 95 | 96 | 100 | 100 |
| portfolio-desktop.report.json | 100 | 96 | 100 | 100 |
| portfolio-mobile.report.json | 71 | 96 | 100 | 100 |
| service-desktop.report.json | 83 | 96 | 100 | 100 |
| service-mobile.report.json | 88 | 96 | 100 | 100 |

## Completed real local form persistence check
28 pages checked on mobile. 25 submissions reached the isolated server and 25 lead rows were saved. Success messages were checked in the browser. CRM and Telegram disabled; network none. This is not evidence of production delivery.
The blog listing, PPF and antikor pages had no visible inline phone field in this scenario. Quiz paths are covered separately; absence of an inline form is not a passed submission.
Artifacts: .studio-tmp/browser-repair/forms-e2e.json, forms-e2e.log, forms-e2e-server.log, forms-e2e-screens/.
| Page | Requests | Stored leads | Visible confirmation |
|---|---:|---:|---|
| entry- | 1 | 1 | False |
| entry-contacts | 1 | 1 | True |
| entry-about | 1 | 1 | True |
| entry-portfolio | 1 | 1 | True |
| entry-blog | 0 | 0 | not tested |
| entry-blog_antidozhd-zachem-nuzhen | 1 | 1 | True |
| entry-portfolio_bmw-420d-detailing | 1 | 1 | True |
| entry-ppf | 0 | 0 | not tested |
| entry-polirovka | 1 | 1 | True |
| entry-himchistka | 1 | 1 | True |
| entry-shumoizolyaciya | 1 | 1 | True |
| entry-antihrom | 1 | 1 | True |
| entry-tonirovka | 1 | 1 | True |
| entry-ustanovka-linz | 1 | 1 | True |
| entry-regulirovka-far | 1 | 1 | True |
| entry-polirovka-stekol | 1 | 1 | True |
| entry-polirovka-far | 1 | 1 | True |
| entry-antidozhd | 1 | 1 | True |
| entry-remont-vmyatin | 1 | 1 | True |
| entry-zashchitnye-pokrytiya | 1 | 1 | True |
| entry-ustanovka-signalizacii | 1 | 1 | True |
| entry-broneplenka | 1 | 1 | True |
| entry-oklejka-avto | 1 | 1 | True |
| entry-detayling-kuzova | 1 | 1 | True |
| entry-vyezdnoj-detayling | 1 | 1 | True |
| entry-antikor | 0 | 0 | not tested |
| entry-ustanovka-signalizacii_avtozapusk | 1 | 1 | True |
| entry-ustanovka-signalizacii_vybor-signalizacii | 1 | 1 | True |

## Completed real local quiz persistence check
Artifact: .studio-tmp/browser-repair/quiz-e2e.json and screens-quiz-e2e-*.png. Isolated local server, CRM/Telegram disabled, network none.
- / at 375 px: visible success=True, requests=1, saved leads=1, error=none
- / at 1440 px: visible success=True, requests=1, saved leads=1, error=none
- /ppf at 375 px: visible success=True, requests=1, saved leads=1, error=none
- /ppf at 1440 px: visible success=True, requests=1, saved leads=1, error=none
- /polirovka at 375 px: visible success=True, requests=1, saved leads=1, error=none
- /polirovka at 1440 px: visible success=True, requests=1, saved leads=1, error=none
- /antikor at 375 px: visible success=False, requests=0, saved leads=0, error=locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for getByText(/^Шаг \d из \d$/).first().locator('..').locator('..').getByRole('button',
- /antikor at 1440 px: visible success=False, requests=0, saved leads=0, error=locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for getByText(/^Шаг \d из \d$/).first().locator('..').locator('..').getByRole('button',

### Visual clarification for /antikor
The saved 375px screenshot was opened and visually inspected. The page explicitly says the studio does NOT provide underbody anticorrosion treatment and links to body protection alternatives and contacts. It has no inline form or quiz by design. The two quiz locator timeouts on this page are NOT proof of a broken quiz; classify this flow as not applicable, and assess whether advertising/navigation correctly avoids presenting the unavailable service. Six actual quiz submissions on home/PPF/polishing were saved successfully.
