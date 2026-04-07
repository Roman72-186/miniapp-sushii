---
tags: [integration, yookassa, payments]
date: 2026-04-07
---

# YooKassa платежи

Используется для приёма оплаты подписок.
Переменные: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`

## Поток платежа

```
1. PaymentPage → POST /api/create-payment
        ↓
2. YooKassa создаёт платёж, возвращает confirmation_url
        ↓
3. Пользователь оплачивает на странице YooKassa
        ↓
4. YooKassa → POST /api/yookassa-webhook (событие payment.succeeded)
        ↓
5. Webhook:
   - Обновляет users в SQLite (tariff, subscription_start/end, payment_method_id)
   - Создаёт заказ в Frontpad
   - Начисляет SHC-комиссии реферерам
   - Начисляет амбассадорские комиссии
        ↓
6. Return URL: /discount-shop?telegram_id=...&payment=success
   → force sync + показ баннера об успехе
```

## Рекуррентные платежи (автосписание)

После первой оплаты YooKassa возвращает `payment_method_id`.
Он сохраняется в `users.payment_method_id`.

При наличии `payment_method_id`:
- `autoRenewStatus = 'активно'`
- Cron каждый день в 10:00 UTC пытается списать за истёкшие подписки

Отмена: `POST /api/cancel-subscription` → `payment_method_id = NULL`

## Webhook (`api/yookassa-webhook.js`)

IP-проверка: `185.71.76.*`, `185.71.77.*` + fallback через API.

Телефон в чеке (54-ФЗ): `+7XXXXXXXXXX` — **с плюсом**, в отличие от всех остальных мест.
→ [[нормализация номера телефона]]

Настройка в ЛК YooKassa:
`https://sushi-house-39.ru/api/yookassa-webhook`

## Действия после успешного платежа

1. `recordPayment()` → таблица `payments`
2. `upsertUser()` → обновить tariff, subscription_start/end, payment_method_id
3. `createFrontpadOrder()` → заказ в CRM
4. `processCommissions()` → амбассадорские комиссии (30% level1, 5% level2)
5. `processReferralSHC()` → 20% от суммы → SHC пригласившему
6. `processReferralBonus()` → SHC за реферала + пороговые бонусы

## Связанные заметки
- [[тарифы подписки]]
- [[реферальная система и SHC-баланс]]
- [[база данных SQLite]]
