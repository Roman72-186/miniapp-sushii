# 2026-04-18 — Фиксы истории подарочных периодов

## Что сделано

### 1. Фикс зависания «Загрузка...» в секции «🎁 Подарочные периоды»
`ProfilePage.js` шлёт `GET /api/get-gift-windows?telegram_id=...`, но handler требовал только POST → 405 → `giftWindows` навсегда `null` → спиннер. Handler теперь принимает оба метода и читает `telegram_id` из `req.query` или `req.body`.

Файл: `api/get-gift-windows.js`
Коммит: `ddc1d52`

### 2. Статус «период прошёл» для незабранных окон
Раньше `GiftPeriodsHistory` отдавал 3 состояния: `claimed / upcoming / available`. Окна с `end < today` и без `claimed` ошибочно отображались как available. Теперь отдельное состояние **«✕ Период прошёл — подарок недоступен»** (серым, opacity 0.55).

Файл: `src/components/GiftPeriodsHistory.js`
Коммит: `2074ef8`

## Развёрнуто на VPS
- Pull + docker compose up --build + restart app прошёл успешно.
- Между попытками был таймаут SSH (видимо fail2ban сработал на серии connect попыток) — со стороны пользователя сервер всё время работал.

## Файлы
- `api/get-gift-windows.js` — GET/POST + `req.query.telegram_id`
- `src/components/GiftPeriodsHistory.js` — новый ветка `end < today && status !== 'claimed'` → expired stylesheet

## Открытые вопросы
- (нет)

## Ловушки для будущего
- При добавлении API endpoint проверять, какой HTTP-метод реально шлёт фронт. `server.js` использует `app.all(...)`, поэтому метод доходит до handler'а, а несоответствие проявляется только там. В данном случае фронт был уже таким давно — просто никто не смотрел на `giftWindows` в ProfilePage, пока не добавили секцию.
