# 2026-04-17 (8) — Полный аудит + critical security fixes

## Что сделано

### Архитектурный аудит
- Запустил architect agent с полным анализом 9 измерений
- Отчёт: `obsidian-vault/audits/2026-04-17 — полный аудит проекта.md`
- 10 рисков в карте, 3 Critical/High

### Critical security fixes
1. **`api/_lib/admin-auth.js`**: убран fallback `'test123'` и DEBUG-логи, печатавшие пароль в консоль
2. **`api/cron-subscriptions.js`**: endpoint закрыт если `CRON_SECRET` пустой (раньше — открыт)
3. **`api/_lib/blob-store.js`, `api/_lib/user-cache.js`**: write через tmp+rename — атомарная запись, защита от race-condition при concurrent обращениях

### VPS
- Сгенерирован и добавлен `CRON_SECRET` (hex 64) в `~/miniapp-sushii/.env`
- Создан `/root/backup-sushii-db.sh` + cron `0 3 * * *` — ежедневный бэкап SQLite через `docker exec ... node /app/scripts/backup-db.js` + ротация 14 дней
- Тест-запуск бэкапа прошёл, файл `sushii.backup.2026-04-17_09-58-05.db` создан в volume

### Деплой
- Commit `ddd6bfa` → push → `git pull && docker compose up -d --build` на VPS
- Новый контейнер запустился, smoke-тесты:
  - `/api/cron-subscriptions` без секрета → 403 ✅
  - `/api/admin/login` с `test123` → 403 ✅ (реальный пароль другой)
  - `/` → 200, `/api/admin/pricing` → 200, `/api/gift-items` → 200

## Что НЕ сделано (из аудита, на будущее)

- Rate limiting на `/api/game-guess` и auth-endpoints
- Удаление legacy Telegram-кода из `UserContext.js`, `sync-user.js`
- Централизация phone normalization (сейчас в 4+ местах)
- Внешний cron вместо `setTimeout` в `server.js` (теперь можно — есть CRON_SECRET)
- Аудит admin-endpoints на SQL injection
- Health-check endpoint + внешний мониторинг (UptimeRobot)
- Unit-тесты на utilities

## Открытые вопросы

- В `admin-auth.js` осталось `console.log` только в checkAuth (без пароля) — ок
- `setTimeout`-cron в `server.js` и `/api/cron-subscriptions` теперь работают оба; второй можно перевести во внешний cron на VPS для надёжности
