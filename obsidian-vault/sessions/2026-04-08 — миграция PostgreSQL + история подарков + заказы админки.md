---
tags: [session]
date: 2026-04-08
---

# Сессия 2026-04-08 — миграция PostgreSQL + история подарков + заказы в админке

## Задача
1. Завершить миграцию данных SQLite → PostgreSQL (Supabase)
2. Сохранять адрес самовывоза при получении подарка + показывать историю подарков
3. Добавить вкладку «Заказы» в админку для администратора Юлии

---

## Сделано

### 1. Миграция SQLite → Supabase PostgreSQL ✅
- Исправлены скрипты `/root/run-migration.sh` и `/root/run-switchover.sh` на VPS:
  - **Проблема 1:** `scripts/` нет в Docker image → добавлен `docker cp` перед `docker exec`
  - **Проблема 2:** health check возвращал 404 (sync-user не находит юзера `_health_`) → увеличено время ожидания до 3 мин с retry каждые 10 сек, добавлен 404 как валидный ответ
- Миграция запущена вручную: 204 пользователя перенесены, `USE_SUPABASE=true` активирован
- Сайт работает на PostgreSQL, cron удалён (больше не нужен)

### 2. История подарков с адресом самовывоза ✅
- `api/_lib/db.js` + `api/_lib/db-pg.js` — добавлено поле `address TEXT` в `gift_history`, обновлены `insertGiftHistory` и `getGiftHistory`
- Supabase: выполнен `ALTER TABLE gift_history ADD COLUMN IF NOT EXISTS address TEXT`
- `api/claim-gift.js` — принимает `address` из body
- `src/components/SubCheckoutModal.js` — передаёт `selectedPickup.address` в claim-gift
- `api/get-gift-history.js` (новый) — `GET /api/get-gift-history?telegram_id=X`
- `server.js` — зарегистрирован новый роут
- `src/ProfilePage.js` — раздел «🎁 История подарков» с датой, адресом и типом (Ролл/Сет)
- `src/shop.css` — стиль `.profile-gift-address`
- `api/admin-subscribers.js` — адрес из gift_history приложен к blob-store окнам по `window_num`
- `src/AdminPage.js` — в карточке подписчика адрес показывается рядом с датой: `#1 08.04.2026 — ул. Автомобильная`

### 3. Вкладка «◷ Заказы» в админке ✅
- `api/_lib/db.js` + `api/_lib/db-pg.js` — новая функция `getGiftOrders()` (JOIN gift_history + users)
- `api/admin-gift-orders.js` (новый) — `GET /api/admin/gift-orders` с auth
- `server.js` — зарегистрирован роут
- `src/AdminPage.js` — 7-я вкладка «◷ Заказы»:
  - Список всех полученных подарков (300 последних), новые первые
  - Карточка: тип (Ролл — cyan, Сет — green), дата, имя, тариф, телефон, адрес (yellow)
  - Поиск по имени / телефону / адресу
  - Кнопка «Обновить»

---

## Контекст по Юлии
Юлия — администратор ресторана, управляет операционной частью. Смотрит обычные заказы через бота «Зенки». Нужна видимость по подарочным заказам подписчиков. Концепция проекта — уходить от Telegram, всё в мини-аппе/браузере.

---

## Проблемы / Решения

### Миграция ломалась дважды
1. `Cannot find module '/app/scripts/migrate-sqlite-to-pg.js'` — `scripts/` не в Docker image. Решение: `docker cp` перед `docker exec`
2. Health check возвращал 404 и запускал автооткат — `/api/sync-user` возвращает 404 для незнакомого `telegram_id`. Решение: принять 404 как OK, увеличить таймаут до 3 мин

### Побочный вопрос от Юлии — delivery routing
Delivery-заказы иногда попадают на неверные точки Frontpad из-за непостоянного геокодирования одного адреса. «Филиал Подписка» — это нормальное поведение: yookassa-webhook создаёт отдельный учётный заказ `name: 'Подписка'` без affiliate. Не баг. Проблема routing пока не решалась.

---

## Коммиты
- `7af40a9` — feat: история подарков с адресом самовывоза в профиле и админке
- `fb9cbc6` — feat: вкладка «Заказы» в админке — все полученные подарки с поиском

## Изменённые файлы
- `api/_lib/db.js` — миграция address, getGiftOrders
- `api/_lib/db-pg.js` — то же для PostgreSQL
- `api/claim-gift.js` — принимает address
- `api/get-gift-history.js` (новый)
- `api/admin-gift-orders.js` (новый)
- `api/admin-subscribers.js` — адрес к окнам
- `server.js` — 2 новых роута
- `src/components/SubCheckoutModal.js` — передаёт address
- `src/ProfilePage.js` — история подарков
- `src/AdminPage.js` — адрес в карточке + вкладка «Заказы»
- `src/shop.css` — .profile-gift-address
- VPS: `/root/run-migration.sh`, `/root/run-switchover.sh` (исправлены)

---

## Следующие шаги
- Delivery routing: разобраться с непостоянным геокодированием (жалоба Юлии)
- Фото для 46 товаров без картинки (из предыдущей сессии)
