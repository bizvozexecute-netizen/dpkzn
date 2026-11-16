# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Premium auto detailing studio website for Kazan, Russia. 18+ pages, Next.js 16 (App Router), dark theme.
80% mobile traffic. Each page is a standalone landing page for Yandex.Direct ads.

## Commands

```bash
npm run dev          # localhost:3000
npm run build        # db:migrate + next build; preserves existing content
npm run start        # Run production server
npm run lint         # ESLint (eslint-config-next with core-web-vitals + typescript)

# Database
npm run db:generate  # Generate Drizzle migrations from schema changes
npm run db:migrate   # Apply migrations to SQLite database
npm run db:seed      # Seed database from src/lib/db/seed.ts
npm run db:reset     # Delete DB + migrate + seed (destructive)

npm run feed:images  # JPG-копии из public/images/hero/ в public/images/feed/ для YML-фида Яндекс Бизнеса
                     # Витрина карточки берётся из https://dpkzn.ru/yml (src/app/yml/route.ts)

# Deploy — VPS + PM2 (NOT Vercel). Prod domain: dpkzn.ru
# On server (root@cv6178245): cd /var/www/dpkzn && git pull && npm run build && pm2 restart 0 && npm run indexnow
# npm run feed:images — JPG-копии из public/images/hero/ для YML-фида Яндекс Бизнеса (public/images/feed/)
# npm run indexnow — IndexNow-пинг Яндексу/Bing об изменённых URL (ключ в public/*.txt, скрипт scripts/indexnow.mjs)
# Env vars in .env.local on server: CRM_WEBHOOK_URL, TG_BOT_TOKEN, TG_CHAT_ID, BOT_API_PROXY (CONNECT-прокси к api.telegram.org, фолбэк на прямое соединение — src/lib/telegram.ts)
# db:seed deletes existing content; use only for initial setup with ADMIN_PASSWORD set
```

E2E testing uses Playwright (`playwright` package installed as devDependency).

## Stack

- Next.js 16.1.6 (App Router, TypeScript, `src/` directory, `@/*` path alias)
- React 19, Tailwind CSS 4 with `@tailwindcss/typography`
- **SQLite** (better-sqlite3) + **Drizzle ORM** — file-based DB at `data/detailing.db`
- Framer Motion 12 (scroll animations desktop only >768px)
- Swiper.js 12 (carousels, touch)
- React Hook Form 7 + Zod 4 (forms + validation)
- Lucide React (icons), sharp (image processing)
- next/font/google: Inter (400,600,700) + Montserrat (700,800)
- jose + bcryptjs (admin auth via JWT)

## Principles (violation = bug)

### MOBILE-FIRST (80% traffic)
- CSS: start at 375px, then `md:` 768px, then `lg:` 1280px
- All buttons `min-h-[44px]` (tap targets >= 44x44px)
- Input font-size >= 16px (iOS zoom prevention on all inputs)
- Padding-bottom on last block >= 80px (floating panel clearance via `.pb-safe`)
- No hover-only effects without touch fallback
- No horizontal scroll — test at 320px, 375px, 414px
- `scroll-margin-top: 80px` on anchor targets (header clearance)

### CONVERSION-FIRST
- Lead capture form on every page minimum 2x (hero + final)
- WhatsApp button visible ALWAYS (header desktop, floating panel mobile)
- Phone clickable via `tel:` on mobile
- CTAForm shows "Ответим за 15 минут" + WhatsApp icon below form

### DARK THEME TOKENS (gold monochrome — src/styles/globals.css is the source of truth)
```
bg:         #0C0B09 (primary)   #171513 (cards)     #1E1C18 (hover)   #110F0B (warm)
text:       #F5F4F0 (primary)   #B0AAA4 (secondary)
accent:     #D4B830 (gold — CTA, prices, badges, links; --color-accent-lime is aliased to gold)
            #D45555 (red — discounts, warnings)
            #25D366 (whatsapp)  #2E75B6 (phone)
border:     #2A2723
gradient:   #0C0B09 → #12111A (section backgrounds for depth)
```
NOTE: admin panel still uses the old cyan/lime palette hardcoded — internal tool, intentionally not migrated.

### PERFORMANCE
- Lighthouse Mobile > 90 (all metrics)
- LCP < 2.5s, CLS < 0.1
- Images: next/image, loading="lazy" (except hero: `priority={true}`), WebP, responsive sizes
- Hero image: `sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"`
- Fonts: next/font, font-display: swap, CSS vars `--font-inter`, `--font-montserrat`
- Border-radius: card=12px, button=8px

## Architecture

Two route groups under `src/app/`:
- `(site)/` — public-facing pages (layout includes Header, Footer, MobileFloatingPanel, funnel elements)
- `(admin)/admin/` — admin panel (separate layout, JWT auth)

```
src/
├── app/
│   ├── layout.tsx              # Root: fonts, viewport, metadata only
│   ├── (site)/
│   │   ├── layout.tsx          # Site shell: Header+Footer+Panels+Metrika+SiteDataProvider+funnel
│   │   ├── page.tsx            # Homepage
│   │   ├── [service]/page.tsx  # 19 dynamic service pages
│   │   ├── portfolio/          # Listing + [slug] detail (with gallery lightbox)
│   │   ├── blog/               # Listing + [slug] detail
│   │   ├── about/ contacts/ privacy/
│   │   └── not-found.tsx
│   ├── (admin)/admin/
│   │   ├── login/page.tsx      # Admin login
│   │   └── (dashboard)/        # CRUD for services, blog, portfolio, reviews, team, settings
│   ├── api/
│   │   ├── submit/route.ts     # POST → CRM webhook + Telegram
│   │   └── admin/              # REST API for admin panel (auth, CRUD, upload, settings)
│   ├── sitemap.ts / robots.ts
│   └── layout.tsx              # Root layout
├── components/
│   ├── layout/                 # Header, Footer, MobileFloatingPanel, FullscreenMenu
│   ├── sections/               # 12+ reusable section blocks
│   ├── funnel/                 # ExitPopup, Callback, Quiz, Toast, Timer, LoadBar, ScrollTracker
│   └── ui/                     # Button, Input, Badge, Card, Modal, AnimatedSection, etc.
├── lib/
│   ├── db/
│   │   ├── schema.ts           # Drizzle schema (20+ tables with relations)
│   │   ├── index.ts            # DB connection (better-sqlite3, WAL mode)
│   │   ├── seed.ts             # Seed script (run via tsx)
│   │   └── queries/
│   │       ├── services.ts     # getService(slug), getServicesForHomepage, getCarClassesForPricing
│   │       ├── settings.ts     # getSettings, getNavItems, getLiveStatus, getSocialProofItems, etc.
│   │       └── content.ts      # Blog posts, portfolio works, reviews, team queries
│   ├── site-data.tsx           # SiteDataProvider context (React Context for shared site data)
│   ├── analytics.ts            # Yandex.Metrika wrapper
│   ├── form-submit.ts          # submitForm() → fetch /api/submit + UTM + localStorage markers
│   ├── constants.ts            # Static constants
│   ├── types.ts                # Shared TypeScript types
│   ├── icons.ts                # Icon name → Lucide component mapping
│   └── utils.ts                # cn(), formatPhone(), isValidPhone()
├── styles/globals.css          # Tailwind + custom utilities (.container-main, .section-padding, .glass, .pb-safe)
data/                           # SQLite database file (gitignored, created by db:migrate + db:seed)
drizzle/                        # Migration SQL files (committed)
```

## Key Architecture Patterns

### Database-driven content
All content (services, prices, FAQ, blog, portfolio, settings) lives in SQLite via Drizzle ORM. Schema: `src/lib/db/schema.ts`. Queries: `src/lib/db/queries/`. Initialize a new database with migrations and an explicit seed; normal builds do not seed. NEVER hardcode text, prices, or FAQ in components.

### SiteDataProvider context
The `(site)/layout.tsx` fetches shared data (phone, nav, live status, seasonal offer, quiz categories, car classes) from the DB and passes it via `SiteDataProvider`. Client components access it via `useSiteData()` hook from `src/lib/site-data.tsx`.

### Service page assembly
Each `[service]/page.tsx` = import sections + `getService(slug)` from DB. Standard order: HeroSection -> BeforeAfterSlider (if visual) -> ServicePackages -> ProcessSteps -> WorkExamples -> FAQAccordion -> CTAForm -> SEOText -> CrossSellBanner.

### Admin panel
Full CRUD at `/admin` with JWT auth (jose + bcryptjs). REST API routes under `src/app/api/admin/`. Manages all DB content: services (with nested packages, prices, FAQ, process steps), blog, portfolio, reviews, team, and site settings.

### Pricing model
Two pricing patterns in DB: **package-based** (servicePackages -> packageClassPrices matrix by car class) and **element-based** (elementPrices -> elementClassPrices matrix). Car classes are 5 pricing tiers. Price can be NULL = "Дог." (negotiable).

### Section components
11 universal + 1 homepage-only (ServicesGrid). 3 service-specific unique blocks:
- PhotoComparison -> `/tonirovka`
- CarBrandGrid -> `/ustanovka-linz`
- BrandsGrid -> `/rusifikaciya-avto`

Note: `/shumoizolyaciya` has NO BeforeAfterSlider (not visual).

### Funnel system (spec in `docs/FUNNEL.md`)
Global in `(site)/layout.tsx`: ExitIntentPopup (desktop mouse-leave only, no mobile back-hijack), CallbackWidget, SocialProofToast, ScrollTracker. Page-level: SeasonalTimer + QuizCalculator + StudioLoadBar on homepage and service pages. Post-submit localStorage marker suppresses exit popup and social proof toast.

### SEO
Every page needs `generateMetadata()` with title <= 60 chars including "Казань" + "| Detailing Place". JSON-LD types: AutoRepair + WebSite (site layout, with sameAs → Yandex Maps org 49387442667), Service (service pages), BlogPosting (blog), FAQPage (FAQAccordion auto-generates), BreadcrumbList (all pages except home). Semantic-core coverage is measured by `node scripts/coverage-report.mjs` (needs fresh db:reset) — keep every money cluster >=90%.

### Form pipeline
CTAForm -> `submitForm()` -> `POST /api/submit` -> CRM webhook + Telegram.

### Framer Motion
Scroll animations (`useInView` + `motion.div` fade-up) on desktop >768px ONLY. Mobile gets instant rendering.

## Sprint Workflow

Implementation follows sprints in `docs/sprints/` strictly in order. Each sprint has a checklist.

| Sprint | What |
|--------|------|
| 1 | Foundation: UI kit, Header, Footer, MobileFloatingPanel, constants, utils |
| 2 | 12 section components + services.ts data + unique blocks |
| 3 | All 18 pages assembled from sections + SEO metadata |
| 4 | Sales funnel: 6 conversion elements (`docs/FUNNEL.md`) |
| 5 | UX polish: animations, lazy loading, touch, Lighthouse >90 |
| 6 | SEO (JSON-LD, sitemap, robots), analytics (24 goals), API route, deploy |

## Business Data (source of truth = DB seed, src/lib/db/seed.ts settings)
```
Phone:    +7 (919) 644-93-93 (raw 79196449393 — also WhatsApp/Telegram/MAX)
Address:  пр-т Хусаина Ямашева, 7к1, Казань (coords 55.8203, 49.0993)
Hours:    Ежедневно 08:00–18:00
Metrika:  ID 108387254
Yandex Business org: 49387442667 (yandex.ru/maps/org/detailing_place/49387442667/)
CRM URL:  (amoCRM webhook — set as CRM_WEBHOOK_URL env var; Telegram lead bot configured)
Partner brands: LLumar, SunTek, Koch Chemie, Ceramic Pro, Comfort Mat, STP
Legal requisites (ИП/ИНН/ОГРНИП): NOT yet public — blocks hidden on /contacts and /privacy until provided
```

## SEO / traffic docs
- `docs/seo/coverage-report.md` — Wordstat coverage per cluster (regenerate: db:reset + coverage-report.mjs)
- `docs/seo/direct-audit.md` — Yandex.Direct audit + restart plan (campaign 708719666)
- `docs/seo/offsite-plan.md` — Yandex Business card / reviews / directories checklist
- `docs/seo/avito-launch.md` — Avito: 6 ready ad texts (1500+ chars each), ranking mechanics, photo mapping, launch schedule
- `docs/seo/vk-ads-playbook.md` — VK Ads: funnel goes through community + messaging (NOT site forms), audiences that work/fail, creatives, seasonality
- `docs/seo/link-building-pack.md` — external listings (2GIS, Zoon, Avito, VK), canonical NAP, copy-paste texts
