---
tags: [atlas, database, sqlite]
date: 2026-04-07
---

# База данных SQLite

Файл: `data/sushii.db`
Клиент: `better-sqlite3` (синхронный, WAL mode)
Код: `api/_lib/db.js`

## Таблицы

### `users`
Основная таблица. Каждый пользователь — одна строка.

| Поле | Тип | Описание |
|------|-----|---------|
| `telegram_id` | TEXT PK | ID пользователя. Telegram: числовой. Веб: `web_TIMESTAMP_random` |
| `name` | TEXT | Имя |
| `phone` | TEXT | Телефон в формате `7XXXXXXXXXX` |
| `tariff` | TEXT | Текущий тариф: `290`, `490`, `1190`, `9990` |
| `invited_by` | TEXT | telegram_id пригласившего |
| `balance_shc` | REAL | SHC-баланс (Sushi House Coins) |
| `is_ambassador` | INTEGER | 0/1, тариф 9990 |
| `subscription_status` | TEXT | `активно` / `неактивно` |
| `subscription_start` | TEXT | Дата начала: DD.MM.YYYY |
| `subscription_end` | TEXT | Дата окончания: DD.MM.YYYY |
| `payment_method_id` | TEXT | ID метода оплаты YooKassa (для автосписания) |
| `ref_url` | TEXT | Реферальная ссылка пользователя |
| `partner_code` | TEXT | 6 символов A-Z2-9 |
| `watbot_contact_id` | TEXT | Устаревшее (WATBOT удалён 2026-03-16) |
| `created_at` | TEXT | datetime('now') |
| `updated_at` | TEXT | datetime('now') |

> ⚠️ Даты подписки — **строки DD.MM.YYYY**, не ISO. Учитывай при сравнении!

### `payments`

| Поле | Тип | Описание |
|------|-----|---------|
| `id` | INTEGER PK | Автоинкремент |
| `telegram_id` | TEXT FK | Ссылка на users |
| `tariff` | TEXT | Тариф на момент оплаты |
| `amount` | REAL | Сумма в рублях |
| `months` | INTEGER | Количество месяцев (обычно 1) |
| `yookassa_payment_id` | TEXT | ID платежа YooKassa |
| `status` | TEXT | `succeeded` |
| `created_at` | TEXT | datetime('now') |

### `transactions`
Комиссии амбассадоров.

| Поле | Тип | Описание |
|------|-----|---------|
| `ambassador_id` | TEXT FK | Кому начислено |
| `referral_id` | TEXT FK | За чью оплату |
| `payment_amount` | REAL | Сумма платежа реферала |
| `commission_amount` | REAL | Начисленная комиссия |
| `commission_percent` | REAL | 30% (level 1) или 5% (level 2) |
| `level` | INTEGER | 1 или 2 |

### `referral_bonuses`
SHC-бонусы за приглашённых друзей (не-амбассадоры).

| Поле | Описание |
|------|---------|
| `user_id` | Кому начислено |
| `referral_id` | За кого |
| `base_amount` | Базовое начисление (50 SHC) |
| `threshold_bonus` | Пороговый бонус (если 1/3/5/10/... друзей) |
| `total_amount` | Итого |
| `friends_count` | Счётчик на момент начисления |
| `achievement` | Текст достижения |

## Миграции

Выполняются инлайн в `getDb()` через `try { ALTER TABLE ... } catch {}`:
```js
try { _db.exec('ALTER TABLE users ADD COLUMN partner_code TEXT'); } catch {}
```

## Ключевые функции `db.js`

| Функция | Описание |
|---------|---------|
| `upsertUser(data)` | INSERT OR UPDATE пользователя |
| `getUser(telegramId)` | Получить пользователя по ID |
| `processCommissions(...)` | Начислить комиссии амбассадорам |
| `processReferralSHC(...)` | Начислить 20% от подписки в SHC |
| `processReferralBonus(...)` | Начислить SHC за нового реферала |
| `renewSubscription(...)` | Продлить подписку после рекуррентного платежа |
| `deactivateSubscription(...)` | Деактивировать подписку |
| `cancelAutoRenew(...)` | Убрать `payment_method_id` |

## Индексы

```sql
idx_users_invited_by        -- для подсчёта рефералов
idx_payments_telegram_id    -- для истории платежей
idx_transactions_ambassador -- для транзакций амбассадора
idx_referral_bonuses_user   -- для SHC-истории
```

## Связанные заметки
- [[реферальная система и SHC-баланс]]
- [[тарифы подписки]]
- [[файловый кэш пользователей — зачем и как]]
