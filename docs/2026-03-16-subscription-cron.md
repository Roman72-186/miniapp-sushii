# Система управления подписками — 16.03.2026

## Что было сделано

### 1. Страница подарочных сетов `/gift-sets`

**Файлы:** `src/GiftSetsPage.js` (новый), `src/App.js` (обновлён)

Создана страница `/gift-sets` — аналог `/gift-rolls`, но для сетов:
- Источник данных: `подписка 490/sets-490.json` (9 позиций)
- Заголовок: «Сеты в подарок»
- Подсказка: «Выберите один сет — входит в вашу подписку»
- Сообщение в боте после заказа: эмодзи 🍱 (вместо 🍣 у роллов)
- Поведение идентично GiftRollsPage: выбор → форма → подтверждение → закрытие мини-аппа

**Ссылка для бота:** `https://sushi-house-39.ru/gift-sets?telegram_id={telegram_id}`

---

### 2. Cron-система проверки подписок

**Файл:** `api/cron-subscriptions.js` (новый)

Ежедневная автоматическая проверка подписок, запускается в **13:00 МСК** (10:00 UTC).

#### Логика работы:

| Событие | Действие |
|---------|----------|
| Подписка истекает через **3 дня** | Уведомление в Telegram. Если нет автосписания — кнопка «Продлить подписку» |
| Подписка истекает **завтра** | Повторное уведомление с предупреждением |
| Подписка истекает **сегодня** + есть `payment_method_id` | Попытка рекуррентного списания через YooKassa API |
| Рекуррентное списание **успешно** | Подписка продлевается на 30 дней, уведомление об успехе, комиссии амбассадорам |
| Рекуррентное списание **не прошло** | Подписка деактивируется, уведомление с кнопкой ручного продления |
| Подписка истекает **сегодня** + нет `payment_method_id` | Подписка деактивируется, уведомление «Подписка истекла» |

#### Рекуррентные платежи:

Цены автосписания (всегда 1 месяц):
- Тариф 290 → 290₽
- Тариф 490 → 490₽
- Тариф 1190 → 1190₽
- Тариф 9990 (Амбассадор) — рекуррент не применяется (разовый платёж)

#### Ручной запуск:

```
GET/POST https://sushi-house-39.ru/api/cron-subscriptions?secret=sushii-cron-2026-secret
```

Защищён секретом (`CRON_SECRET` в `.env`). Без секрета возвращает 403.

#### Автозапуск:

Встроен в `server.js` через `setTimeout` — при старте сервера планируется на ближайшие 10:00 UTC, затем перепланируется каждый день.

---

### 3. PaymentID перенесён из WATBOT в SQLite

**Файлы:** `api/yookassa-webhook.js`, `api/cancel-subscription.js`, `api/_lib/db.js`

#### Что изменилось:

- **Webhook (yookassa-webhook.js):**
  - `payment_method_id` записывается ТОЛЬКО в SQLite (`users.payment_method_id`)
  - Убрана запись `PaymentID` в WATBOT переменные
  - Убрана запись `PaymentID` в файловый кэш
  - Остальная синхронизация с WATBOT (теги, статус, даты) — без изменений

- **Отмена подписки (cancel-subscription.js):**
  - Основная работа теперь через SQLite: `deactivateSubscription(telegram_id)`
  - Очищает `payment_method_id` + ставит `subscription_status = 'неактивно'`
  - Принимает `telegram_id` (обязательный) вместо только `contact_id`
  - WATBOT синхронизация — fire-and-forget (для обратной совместимости, пока не убрали полностью)

- **Фронтенд (SettingsPage.js):**
  - Кнопка отмены теперь передаёт `telegram_id` в запросе

---

### 4. Новые функции в SQLite (db.js)

| Функция | Описание |
|---------|----------|
| `getExpiringSubscriptions(days)` | Подписки, истекающие через N дней |
| `getExpiredToday()` | Подписки, истекающие сегодня |
| `deactivateSubscription(telegramId)` | Деактивация: `status='неактивно'`, `payment_method_id=NULL` |
| `renewSubscription(telegramId, newEndDate)` | Продление после рекуррентного платежа |

---

## Архитектура потока подписки

```
Пользователь оплачивает
  └─ YooKassa webhook (payment.succeeded)
       ├─ SQLite: upsertUser (tariff, dates, payment_method_id)
       ├─ SQLite: recordPayment + processCommissions
       ├─ WATBOT: теги + статус + даты (fire-and-forget)
       └─ Frontpad: заказ для учёта

Каждый день в 13:00 МСК
  └─ cron-subscriptions.js
       ├─ За 3 дня → напоминание
       ├─ За 1 день → напоминание
       └─ Сегодня истекает:
            ├─ Есть payment_method_id → рекуррент через YooKassa
            │    ├─ Успех → renewSubscription + recordPayment + уведомление
            │    └─ Ошибка → deactivateSubscription + уведомление
            └─ Нет payment_method_id → deactivateSubscription + уведомление

Пользователь отменяет подписку
  └─ cancel-subscription.js
       ├─ SQLite: deactivateSubscription (основное)
       └─ WATBOT: удалить PaymentID + неактивно (fire-and-forget)
```

---

## Env-переменные

| Переменная | Где используется | Описание |
|-----------|-----------------|----------|
| `YOOKASSA_SHOP_ID` | create-payment, webhook, cron | ID магазина YooKassa |
| `YOOKASSA_SECRET_KEY` | create-payment, webhook, cron | Секретный ключ YooKassa |
| `TELEGRAM_BOT_TOKEN` | send-bot-message, cron | Токен Telegram бота |
| `CRON_SECRET` | cron-subscriptions | Секрет для ручного запуска cron (NEW) |
| `WATBOT_API_TOKEN` | webhook, cancel-subscription | Токен WATBOT (для обратной совместимости) |

---

## Статус проверки

- [x] `/gift-sets` — HTTP 200, страница открывается
- [x] `/api/cron-subscriptions` без секрета — HTTP 403 (защита)
- [x] `/api/cron-subscriptions?secret=...` — HTTP 200 (cron работает)
- [x] Cron запланирован: следующий запуск 2026-03-16 10:00 UTC (13:00 МСК)
- [x] Все контейнеры Docker UP
- [x] PaymentID хранится только в SQLite
