---
tags: [session, referral, shc, bugfix]
date: 2026-04-12
commit: 7aef209
---

# Сессия 2026-04-12 — Исправление начисления 20% SHC

## Что сделано

Исправлены два бага в реферальной системе SHC (Sushi House Coins):

### Баг 1 (display): счётчик SHC в профиле показывал неверное значение

`ProfilePage.js` строка 559 показывала `shcData.total`, который вычислялся как:
```javascript
const totalShc = bonuses.reduce((sum, b) => sum + b.total_amount, 0);
```
Это сумма из таблицы `referral_bonuses` — туда пишет только `processReferralBonus` (плоские 50 SHC за присоединение). Функция `processReferralSHC` (20% от подписки) вызывала только `updateBalance` напрямую, не записывая в `referral_bonuses`. Результат: счётчик SHC всегда занижал реальный баланс.

**Фикс:** `get-transactions.js` — `shcData.total` заменено на `user.balance_shc` (реальный баланс из БД).

### Баг 2 (история): 20% SHC не видны в разделе «Начисления SHC»

`processReferralSHC` не оставляла записей в `referral_bonuses`, поэтому история выплат за оплату реферала была невидима.

**Фикс:** `processReferralSHC` в `db.js` и `db-pg.js` теперь записывает строку в `referral_bonuses` с:
- `friends_count = 0` (маркер subscription-бонуса, join-бонусы всегда ≥ 1)
- `achievement = '20% от подписки X₽'`
- Всё в транзакции вместе с `updateBalance`

### Защита дубль-чека в `processReferralBonus`

Чтобы subscription-записи не влияли на дубль-чек join-бонуса, добавлено условие `AND friends_count > 0` в запрос проверки существующих записей (оба файла db.js и db-pg.js).

## Изменённые файлы

| Файл | Изменение |
|------|-----------|
| `api/get-transactions.js` | `shcData.total: totalShc` → `user.balance_shc` |
| `api/_lib/db.js` | `processReferralSHC` + дубль-чек `processReferralBonus` |
| `api/_lib/db-pg.js` | те же изменения для PostgreSQL |

## Коммит

`7aef209` — fix: referral SHC — запись 20% в referral_bonuses, исправление счётчика SHC в профиле

## Деплой

Успешно задеплоено на VPS (docker compose up -d --build).

## Как проверить

```bash
docker logs miniapp-sushii-app-1 --tail 100 | grep "referral SHC"
```
При следующей успешной оплате реферала должна появиться строка:
`webhook: referral SHC processed { inviter_id: ..., shc: ... }`

И у пригласившего в профиле появится строка в «Начисления SHC» с текстом «20% от подписки X₽».

## Открытые вопросы

- Нет способа восстановить историю прошлых 20% начислений (они были записаны только в `balance_shc`, без строки в `referral_bonuses`). Если нужно — придётся писать ретро-скрипт.
