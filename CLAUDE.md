# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

Always respond in Russian.

## Build & Run

```bash
# Development
npm start              # React dev server (port 3000)
npm run build          # Production build
node server.js         # Backend only (port 3001)

# Utility scripts
npm run fetch:products  # Fetch product data from Frontpad
npm run backup:db       # Backup SQLite database

# Production (VPS: ssh root@64.188.63.249)
cd miniapp-sushii && git pull && docker compose up -d --build
```

Тесты есть (CRA default, `App.test.js`), но покрывают только базовый рендер: `npm test`. Линтер не настроен.

## Architecture

Telegram Mini App for sushi restaurant. React SPA (CRA) + Express backend + SQLite.

**Frontend** (`src/`): React 19, plain CSS (`shop.css`, `App.css`). Routing via `window.location.pathname` in `App.js` (no react-router). Global state via `UserContext.js` (`useUser()` hook).

**Backend** (`server.js` + `api/`): Express on port 3001. API handlers as individual files in `api/`. Shared utilities in `api/_lib/`.

**Data storage**: SQLite (`data/sushii.db`) is the single source of truth. File-based caches: `data/users/{id}.json` (5-min TTL), `data/gifts/{id}.json` (gift windows blob-store).

**Product catalogs**: JSON files in `public/` → built into `build/`. Admin edits saved to `data/products/` which **take priority over `build/`** when served by Express. Paths: `public/холодные роллы/rolls.json`, `public/запеченные роллы/zaproll.json`, `public/сеты/set.json`, `public/подписка роллы/rolls-sub.json`, `public/подписка сеты/sets-sub.json`, `public/подписка 490/rolls-490.json`, `public/подписка 490/sets-490.json`, `public/подписка запеченные/zaproll-sub.json`, `public/добавки/sauces.json`, `public/гунканы/gunkan.json`.

## Routes (App.js)

| Path | Component |
|------|-----------|
| `/` | `LandingPage` — тарифы, меню для подписчиков |
| `/discount-shop` | `DiscountShopPage` — скидки + подарки |
| `/shop` | `ShopPage` — обычный магазин |
| `/profile` | `ProfilePage` — личный кабинет |
| `/settings` | `SettingsPage` |
| `/pay/:id` | `PaymentPage` |
| `/login` | `LoginPage` — веб-вход по телефону |
| `/benefits` | `BenefitsPage` |
| `/partner-code` | `PartnerCodePage` — ввод кода партнёра |
| `/admin` | `AdminPage` |
| `/gift-rolls` | `GiftRollsPage` — бот-страница подарочных роллов |
| `/gift-sets` | `GiftSetsPage` — бот-страница подарочных сетов |
| `/sets-received` | `SetsReceivedPage` — страница «сет уже получен» |
| `/sets`, `/rolls` | `SetsPage`, `RollsPage` — legacy |
| `/success` | `Success` |

## Critical Patterns

### Static File Priority (server.js)

Express serves in this order (first match wins):
1. `data/banners/` — admin-uploaded images
2. `data/products/` — **admin overrides** (prices, enabled flags)
3. `public/admin/` → served at `/admin` path (static admin HTML pages, before React build)
4. `build/` — original from `public/`

**If you change prices in `public/*.json`, you must also delete stale overrides in `data/products/` on the VPS**, otherwise the old prices persist.

Subscription prices override: `data/products/pricing.json` — if absent, falls back to `DEFAULT_PRICING` in `api/admin-pricing.js`. Updated via `PUT /api/admin/pricing`.

### User Identity (UserContext.js)

Three identity sources, priority order: **JWT (web login) > Telegram WebApp SDK > `?telegram_id=` URL param**.

- JWT token stored in `localStorage` under key `web_token`; decoded client-side, verified server-side
- Web users get IDs prefixed `web_` (e.g. `web_1234567_abc`)
- `isWebUser` flag in context distinguishes web-login from Telegram users

### Auth System (`api/auth/`)

Web login flow (non-Telegram users):
1. `POST /api/auth/login-by-phone` — check phone → returns `hasPassword` or `requiresEmail`
2. `POST /api/auth/send-email-otp` — отправить OTP на email
3. `POST /api/auth/verify-otp` — email OTP verification → returns JWT
4. `POST /api/auth/login-with-password` — password login → returns JWT
5. `POST /api/auth/set-password` — set password after first OTP login

JWT middleware: `api/_lib/auth.js` → `authMiddleware()`. Sets `req.userId`, `req.userEmail`, `req.authMethod`.

**Supabase** (`api/_lib/supabase.js`) используется только в auth-системе: хранит пароли в таблице `web_credentials` (поле `phone`). SQLite — основное хранилище данных пользователей; Supabase — только для паролей веб-входа.

### Admin Product Sync Groups

When admin toggles `enabled` on a product, it syncs across related catalogs by product name:
```
['rolls', 'rolls-sub', 'rolls-490']       # cold rolls
['zaproll', 'zaproll-sub']                 # baked rolls
['sets', 'sets-sub', 'sets-490']           # sets
```

### Phone Normalization

Everywhere: strip to digits, replace leading `8` with `7`, pad 10-digit to `7XXXXXXXXXX`. **No plus sign** except in YooKassa receipt (API requirement: `+7XXXXXXXXXX`). Canonical implementation: `src/utils/phone.js`. Also duplicated in `api/auth/login-by-phone.js` and backend files.

### Discount Calculation

Frontend (`DiscountShopPage.js`) loads subscription catalogs and applies discounts on the fly:
- Rolls (cold + baked): 30% off base price
- Sets: 20% off base price

The JSON files contain **base prices**, not discounted prices.

### User Data Flow

1. Frontend calls `POST /api/sync-user` with `{ telegram_id, tg_name, force }`
2. Backend reads SQLite → `deriveFromDbUser()` → writes to file cache
3. `UserContext` exposes: `telegramId`, `tarif`, `phone`, `profile`, `sync()`, `hasTag()`, `isWebUser`
4. Subscription dates in SQLite stored as **DD.MM.YYYY strings** (not ISO)

**Cache variable naming**: файловый кэш (`data/users/{id}.json`) хранит поля с русскими ключами унаследованного формата: `variables.статусСписания`, `variables.датаНачала`, `variables.датаОКОНЧАНИЯ`, `variables.PaymentID`. Конвертация SQLite → кэш выполняется в `api/_lib/subscription-state.js` через `deriveFromDbUser()`.

### Subscription State (`api/_lib/subscription-state.js`)

Ключевая библиотека: вычисляет `subscriptionStatus` и `autoRenewStatus` из «сырых» данных. Вызывается из `sync-user.js` (из SQLite) и при чтении кэша. Логика:
- `subscriptionStatus = 'активно'` если статус не `'неактивно'` И текущая дата попадает в `[subscription_start, subscription_end]`
- `autoRenewStatus = 'активно'` если `payment_method_id` не пустой

### Payment Flow

1. `PaymentPage` → `POST /api/create-payment` (includes phone for 54-ФЗ receipt)
2. YooKassa redirects user to payment page
3. On success: webhook `POST /api/yookassa-webhook` → updates SQLite + Frontpad order + SHC commissions
4. Return URL: `/discount-shop?telegram_id=...&payment=success` → force sync + success banner

### SHC Balance (Sushi House Coins)

Поле `balance_shc` в таблице `users`. Начисляется:
- За каждого приглашённого реферала: 50 SHC (`processReferralBonus`)
- Пороговые бонусы при 1/3/5/10/.../1000 рефералах (таблица в `db.js`)
- 20% от суммы подписки реферала в SHC пригласившему (`processReferralSHC`)
- Амбассадорские комиссии: 30% (level 1) и 5% (level 2, если ≥10 амбассадоров у «дедушки»)

### Partner Code System

При первой оплате пользователь попадает на `/partner-code`. Код партнёра — 6 символов (A-Z2-9). Применяется через `POST /api/apply-partner-code`. Поле `partner_code` в таблице `users`.

### Gift Windows

Generated by `buildWindows(start, end, windowDays)` in `api/_lib/gift-windows.js`. Tariff 490: every 15 days. Tariff 1190: every 30 days. Admin grants bypass tariff check. Stored in `data/gifts/{telegram_id}.json`.

### Nearest Store

`POST /api/nearest-store` — accepts `{ address }` or `{ lat, lon }`. Geocodes address via `api/_lib/geocoder.js` (Yandex/OSM), then finds nearest pickup by Haversine distance. Store list: `config/stores.json` (4 points in Kaliningrad: Gagarina, Soglasiya, Avtomobilnaya, Guryevsk). Each store has `{ id, name, address, lat, lon, affiliate }` — `affiliate` is the Frontpad affiliate ID used in orders.

### Admin User Management

Beyond products, the admin has three extra endpoints:
- `GET/POST /api/admin/user-tags` — read or modify user tags (derived from `tariff` + `is_ambassador`). Actions: add/remove. Invalidates user file cache.
- `POST /api/admin/add-user-manual` — create or update user by phone; if phone matches existing user, updates their subscription; otherwise creates `web_{phone}` user.
- `GET/PUT /api/admin/pricing` — GET is public (frontend loads prices); PUT requires admin auth. Prices stored in `data/products/pricing.json`.

## Environment Variables

```
YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY  # Payment processing
FRONTPAD_SECRET                         # Order API
TELEGRAM_BOT_TOKEN                      # Bot messages
ADMIN_PASSWORD                          # Admin panel auth
CRON_SECRET                             # Subscription cron endpoint
JWT_SECRET                              # JWT signing (web auth)
ALLOWED_ORIGIN                          # CORS (default: https://sushi-house-39.ru)
SUPABASE_URL                            # Supabase project URL (web auth passwords)
SUPABASE_SERVICE_KEY                    # Supabase service role key (backend)
SUPABASE_ANON_KEY                       # Supabase anon key (browser client)
```

## Deployment

Docker Compose: `app` (Node 20-alpine, port 3001) + `nginx` (reverse proxy, SSL) + `certbot`. Persistent volume `app-data` → `/app/data` (SQLite, caches, admin overrides, banners).

Domain: `https://sushi-house-39.ru`

### При старте сессии
1. Прочитай `obsidian-vault/00-home/index.md` — общая карта проекта
2. Прочитай `obsidian-vault/00-home/текущие приоритеты.md` — что сейчас в работе
3. Прочитай последнюю заметку из `obsidian-vault/sessions/` — что делали в прошлый раз
4. Если задача касается модуля — найди и прочитай нужную заметку из `obsidian-vault/knowledge/`

### В процессе работы
Каждые 3-5 выполненных задачи:
- Перечитай `текущие приоритеты.md` — не отклонились ли от курса
- Сверься с relevant заметками из `knowledge/` — соблюдаем ли паттерны проекта
- Если появился новый контекст — сразу запиши в `inbox/`

### При завершении задачи — УСПЕХ
Когда задача выполнена и задеплоена успешно:
1. Создай заметку в `obsidian-vault/sessions/` с именем `YYYY-MM-DD — краткое описание.md`
2. Запиши в заметке: что сделано, какие файлы изменены, коммиты, решения, открытые вопросы
3. Если обнаружен и исправлен баг — добавь заметку в `obsidian-vault/knowledge/debugging/`
4. Если принято архитектурное решение — добавь в `obsidian-vault/knowledge/decisions/`
5. Обнови `obsidian-vault/00-home/текущие приоритеты.md`:
   - Отметь выполненные задачи как `- [x]`
   - Убери из «Срочно» то, что закрыто
   - Добавь новые открытые вопросы если появились

### При завершении задачи — НЕУДАЧА / ОТКАТ
Если задача не вышла, сломалась или пришлось откатиться:
1. Выполни `git revert` или `git reset` до рабочего состояния, задеплой откат на VPS
2. В `obsidian-vault/sessions/` всё равно создай заметку — с пометкой `[ОТКАТ]` в названии
3. В заметке опиши: что пробовали, почему не сработало, что откатили
4. Если баг — добавь в `obsidian-vault/knowledge/debugging/` с описанием ловушки
5. В `текущие приоритеты.md` задачу НЕ отмечай выполненной — оставь в «Срочно» или «Важно»
6. Удали из Obsidian любые заметки, созданные в ходе неудавшейся задачи (черновики, незавершённые планы)