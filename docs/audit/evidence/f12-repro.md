# F12: воспроизведение тихой потери заявки (16.11.2026, повторная проверка)

Сценарий: `docs/audit/tools/f12-repro.mjs`. Локальный `next start` с `LEADS_DATA_DIR` в новом каталоге `mktemp -d`, пустые `CRM_WEBHOOK_URL`, `TG_BOT_TOKEN`, `TG_CHAT_ID`, Метрика и пиксели заблокированы. Реальные лиды не отправлялись.

Шаги: открыть `/ustanovka-signalizacii/avtozapusk?utm_source=yandex&utm_medium=cpc&utm_campaign=audit_test&yclid=999000111` на 375 px, сразу заполнить телефон (как при автозаполнении) и нажать «Отправить», не дожидаясь 1,5 с.

Снимок: `screens/f12-avtozapusk--375-fast-submit.jpg` — интерфейс показывает «Заявка принята — свяжемся в рабочее время».

## Результат сценария

```json
{
  "url": "http://127.0.0.1:3100/ustanovka-signalizacii/avtozapusk?utm_source=yandex&utm_medium=cpc&utm_campaign=audit_test&yclid=999000111",
  "confirmationVisible": true,
  "elapsedMsSent": 163,
  "apiResponses": [
    {
      "status": 200,
      "body": "{\"success\":true}"
    }
  ],
  "leadsBefore": 0,
  "leadsAfter": 0,
  "persistedLeadDelta": 0,
  "shot": "docs/audit/screens/f12-avtozapusk--375-fast-submit.jpg"
}
```

## Лог сервера (полностью)

```
▲ Next.js 16.1.6
- Local:         http://localhost:3100
- Network:       http://<container-ip>:3100

✓ Starting...
✓ Ready in 733ms
[submit] отброшено ловушкой: source=alarm:avtozapusk website=false elapsed=163
```

Итог: `/api/submit` ответил `200 {"success":true}`, UI показал подтверждение, но в журнале лидов 0 новых записей, а сервер записал `отброшено ловушкой ... elapsed=163`. В предыдущем прогоне через `browser_check` то же сообщение было с `elapsed=138` (значение зависит от скорости отправки). Причина в коде: `src/lib/use-lead-submit.ts:113` отправляет `elapsedMs`, если с монтирования прошло меньше `MIN_FILL_MS`, и `src/app/api/submit/route.ts:125` отбрасывает такую заявку, возвращая успех.
