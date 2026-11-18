# Lighthouse mobile: сводка по страницам сигнализаций

Полные HTML/JSON-отчёты Lighthouse в репозитории не хранятся (каждый ~0,9 МБ). Здесь только цифры и команда для повторного запуска.

Lighthouse 12.8.2, `formFactor=mobile`, троттлинг `simulate` (по умолчанию), локальный `next start` с временной базой заявок и без CRM/Telegram.

## Финальная серия 17.11.2026: 5 прогонов на страницу, медиана

| Страница | Performance | A11y | Best practices | SEO | LCP, медиана по 5 прогонам | CLS | TBT* | Норма LCP ≤ 2,5 с |
|---|---|---|---|---|---|---|---|---|
| `/ustanovka-signalizacii` (хаб) | 95 | 96 | 100 | 100 | 2,79 с | 0 | 70 мс | нет |
| `/ustanovka-signalizacii/avtozapusk` | 97 | 96 | 100 | 100 | 2,56 с | 0 | 60 мс | нет |
| `/ustanovka-signalizacii/vybor-signalizacii` | 96 | 96 | 100 | 100 | 2,60 с | 0 | 80 мс | нет |
| `/ustanovka-signalizacii/starline` | 97 | 96 | 100 | 100 | 2,56 с | 0 | 50 мс | нет |
| `/ustanovka-signalizacii/pandora` | 97 | 96 | 100 | 100 | 2,60 с | 0 | 50 мс | нет |

\* Performance, категории и TBT взяты из медианного по Performance прогона.

## Одиночный повторный прогон 17.11.2026 (только performance)

| Страница | Performance | LCP | CLS | TBT |
|---|---|---|---|---|
| Хаб | 56 | 3,22 с | 0,147 | 13 520 мс |
| Автозапуск | 66 | 2,70 с | 0 | 6 800 мс |
| Выбор сигнализации | 93 | 2,73 с | 0 | 220 мс |
| StarLine | 74 | 2,66 с | 0 | 1 020 мс |
| Pandora | 96 | 2,52 с | 0 | 140 мс |

TBT в этой серии в десятки раз выше, чем в медианах, при том же коде. Скорее всего, в момент замера машина была загружена. Одиночный прогон менее надёжен, чем медиана по 5. Разовый CLS 0,147 на хабе в сериях по 5 прогонов не повторился.

## Сравнение: существующие страницы того же шаблона (одиночный прогон)

| Страница | Performance | LCP | CLS |
|---|---|---|---|
| `/polirovka` | 98 | 2,2 с | 0 |
| `/tonirovka` | 87 | 3,6 с | 0 |

## Как повторить

```bash
npm run build
L=$(mktemp -d)
env -u CRM_WEBHOOK_URL -u TELEGRAM_BOT_TOKEN -u TELEGRAM_CHAT_ID \
  LEADS_DATA_DIR=$L PORT=3199 node_modules/.bin/next start -p 3199 &
O=/tmp/lh-alarm; mkdir -p $O
for p in ustanovka-signalizacii ustanovka-signalizacii/avtozapusk \
         ustanovka-signalizacii/vybor-signalizacii \
         ustanovka-signalizacii/starline ustanovka-signalizacii/pandora; do
  n=$(echo $p | tr / _)
  for r in 1 2 3 4 5; do
    lighthouse http://127.0.0.1:3199/$p --quiet \
      --only-categories=performance,accessibility,best-practices,seo \
      --output=json --output=html --output-path=$O/$n-run$r \
      --chrome-flags="--headless=new --no-sandbox"
  done
  node scripts/lh-median.mjs $O $n   # печатает прогоны и медиану
done
kill %1; rm -rf $L
```

Отчёты пишутся в `/tmp/lh-alarm`, вне репозитория.
