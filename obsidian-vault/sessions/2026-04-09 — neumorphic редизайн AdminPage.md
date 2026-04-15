---
tags: [session, admin, neumorphic]
date: 2026-04-09
---

# 2026-04-09 — Neumorphic редизайн AdminPage

## Что сделано

### AdminPage.js — полный редизайн стиля
- Заменена cyberpunk-палитра `CP` (`#07070f`, неон cyan/pink) на neumorphic `AP` (`#1a1a1a`, teal `#3CC8A1`)
- Добавлены токены `NEU` (card/btnOut/btnIn/teal/tealSm/danger/warn) для консистентных теней
- Backward-compat алиас `CP = { cyan: AP.accent, green: AP.accent, pink: AP.danger, ... }` для inline-стилей в orders-табе
- 2-группная навигация вместо плоского ряда из 7 табов:
  - **Контент**: Товары / Баннеры / Цены
  - **Люди**: Подписчики / Заказы / Добавить / Статистика
- Добавлен `group` state; при клике на группу — переключается на её дефолтный суб-таб
- Карточки: `boxShadow: NEU.card` вместо flat borders
- Кнопки floating (NEU.btnOut) и pressed (NEU.btnIn)
- Исправлены light-colored inline стили (banner info box, pricing note — теперь `AP.muted`)
- Добавлен недостающий стиль `subCard` (был undefined → silent visual bug в orders-табе)

### Сопутствующие задачи (из предыдущего контекста)
- **YooKassa webhook**: передача реальной суммы оплаты во Frontpad (`product_price[0]` = actual amount, убран `sale: '100'`) — коммит `c3efb54`
- **set-password.js**: создание SQLite-пользователя если не найден по телефону (фикс 404 для новых веб-пользователей) — коммит `875bf0a`
- **LandingPage.js**: `sessionStorage` для splash — не показывать повторно после редиректа — коммит `875bf0a`
- **LoginPage.js**: убран шаг `name` из онбординга (телефон → email → OTP → пароль → тарифы) — коммит `875bf0a`

## Файлы изменены
- `src/AdminPage.js` — коммит `41041fa`

## Коммиты
- `41041fa` — feat: AdminPage neumorphic redesign, 2-группная навигация Контент/Люди
- `875bf0a` — splash sessionStorage + new user set-password + LoginPage без имени
- `c3efb54` — YooKassa → Frontpad: передача реальной суммы

## Деплой
- VPS: `docker compose up -d --build && docker compose restart app` — успешно

## Открытые вопросы
- Delivery routing (🔴 Срочно) — не решён
- 46 позиций без фото — не решён
- "Пользователь перехода" — пользователь выбрал «Другое» без уточнения, возможно имел в виду редирект после онбординга
