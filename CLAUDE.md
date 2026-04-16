# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

Always respond in Russian.

## ⚠️ Project is a standalone web app (not a Telegram Mini App anymore)

**The project has fully moved away from Telegram.** It is now a standalone web application with phone-based login (JWT auth). Do NOT treat it as a Telegram Mini App:

- **Do not ask** about Telegram WebApp SDK, `initData` verification, Telegram HMAC, Bot API, or any Telegram-specific integration.
- **Do not design around** Telegram identity, `tg_name` sync, or WebApp-specific flows.
- **`telegram_id` is a legacy field** — it still exists in the `users` table as the PK for historical compatibility, but new users and new features must not depend on it. It will gradually become irrelevant.
- **The only auth mechanism is JWT** (web login by phone → OTP → password → JWT). `api/_lib/auth.js` → `authMiddleware()` with `req.userId`, `req.userEmail`.
- **Identity for new users** is `web_{phone}_{random}`, created by `api/auth/set-password.js`.
- Legacy code paths that reference Telegram (e.g. `sync-user.js` handling `tg_name`, `src/UserContext.js` reading Telegram WebApp SDK, query param `?telegram_id=`) are **dead weight** — do not extend them, do not build new features on top of them, do not introduce regressions in them either. They will be removed gradually.

The project name, directory name, Docker container name, and domain (`sushi-house-39.ru`) still say "miniapp" and reference Telegram — this is historical naming, not a statement about current architecture.

## Build & Run

```bash
# Development
npm start              # React dev server (port 3000)
npm run build          # Production build
node server.js         # Backend only (port 3001)

# Utility scripts
npm run catalog        # Rebuild catalog JSON via scripts/build-catalog-master.py (Python)
npm run backup:db      # Backup SQLite database

# Production (VPS: ssh root@64.188.63.249)
cd miniapp-sushii && git pull && docker compose up -d --build && docker compose restart app
```

Тесты есть (CRA default, `App.test.js`), но покрывают только базовый рендер: `npm test`. Линтер не настроен.

## Architecture

Standalone веб-приложение для суши-ресторана. React SPA (CRA) + Express backend + SQLite (dev) / PostgreSQL Supabase (prod).

**Frontend** (`src/`): React 19, plain CSS (`shop.css`, `App.css`, `shop-v2.css`). Routing via `window.location.pathname` in `App.js` (no react-router). Global state via `UserContext.js` (`useUser()` hook). `shop-v2.css` (~830 строк) — CSS-override для neumorphic дизайна всех страниц магазина; импортируется в `App.js` последним и перекрывает стили из `shop.css`. **Правило**: изменения дизайна магазина — только в `shop-v2.css`, не трогать JSX и `shop.css`.

**Backend** (`server.js` + `api/`): Express on port 3001. API handlers as individual files in `api/`. Shared utilities in `api/_lib/`.

**Data storage**: SQLite (`data/sushii.db`) in dev/staging; **PostgreSQL (Supabase) in production** (env `USE_SUPABASE=true`). The `api/_lib/db.js` is a proxy — when `USE_SUPABASE=true` it re-exports `api/_lib/db-pg.js` (async, `pg` pool). Both modules export identical function names. File-based caches: `data/users/{id}.json` (5-min TTL), `data/gifts/{id}.json` (gift windows blob-store).

**Schema tables** (одинаковые для SQLite и PostgreSQL): `users`, `payments`, `transactions`, `referral_bonuses`, `gift_history`, `orders`. Runtime-миграции идут через `ALTER TABLE ... ADD COLUMN` (в SQLite — try/catch, в PG — `IF NOT EXISTS`). Колонки добавленные после initial schema:
- `users`: `partner_code`, `notes`, `last_address`, `last_pickup_point`, `first_name`, `last_name`, `middle_name`
- `gift_history`: `address`, `gift_name`

Легаси поле `users.name` продолжает писаться синхронно с `first_name + ' ' + last_name` — много мест во фронте/бэке читают его, не удалять.

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
1. `data/banners/` → `/data/banners` — admin-uploaded images
2. `data/product-images/` → `/data/product-images` — admin-uploaded product photos (7-day HTTP cache)
3. `data/products/` — **admin overrides** (prices, enabled flags), no-cache for JSON/HTML
4. `public/admin/` → served at `/admin` path (static admin HTML pages, before React build)
5. `build/` — original from `public/`

**If you change prices in `public/*.json`, you must also delete stale overrides in `data/products/` on the VPS**, otherwise the old prices persist.

**Adding a new item to a catalog**: updating `public/запеченные роллы/zaproll.json` does NOT automatically add it to `zaproll-sub.json` — the subscription catalog must be updated separately. Admin sync only propagates `enabled` flag changes for items that already exist in both catalogs.

**VPS override files**: `data/products/` inside the Docker volume may contain admin-saved overrides for subscription catalogs (e.g. `data/products/подписка запеченные/zaproll-sub.json`). New items added to `public/` will NOT appear until the override file is also updated. Check with: `docker exec miniapp-sushii-app-1 ls /app/data/products/`.

**Images must be committed to git**: files in `public/new_roll/` that are untracked will not be deployed. Always `git add` new images before deploying.

Subscription prices override: `data/products/pricing.json` — if absent, falls back to `DEFAULT_PRICING` in `api/admin-pricing.js`. Updated via `PUT /api/admin/pricing`.

### User Identity (UserContext.js)

**Единственный рабочий источник identity — JWT** (`localStorage.web_token`, декодируется клиентом, проверяется сервером через `api/_lib/auth.js`). Новые юзеры получают ID вида `web_{timestamp}_{random}` из `api/auth/set-password.js`.

Старые источники в `UserContext.js` (Telegram WebApp SDK, `?telegram_id=` URL param) и флаг `isWebUser` — **legacy**: остались ради уже существующих юзеров с числовыми `telegram_id`, трогать не нужно.

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

1. Frontend calls `POST /api/sync-user` с `{ telegram_id, force }` (поле `tg_name` ещё отправляется для legacy-юзеров, для новых пустое — игнорируется).
2. Backend читает из SQLite/PG → `deriveFromDbUser()` → пишет в файловый кэш.
3. `UserContext` прокидывает в `profile`: `name`, `first_name`, `last_name`, `middle_name`, `phone`, статус подписки и даты, `balance_shc`, `partner_code`.
4. Subscription dates хранятся как **`DD.MM.YYYY` строки** (не ISO!). Парсинг — `api/_lib/subscription-state.js`.

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
- За каждого приглашённого реферала: 50 SHC (`processReferralBonus`) — **активно**
- Пороговые бонусы при 1/3/5/10/.../1000 рефералах (таблица в `db.js`) — **активно**
- 20% от суммы подписки реферала в SHC пригласившему (`processReferralSHC`) — **активно**
- Амбассадорские комиссии: 30% (level 1) и 5% (level 2) через `processCommissions()` — **намеренно отключены**, функция не вызывается из webhook

### Partner Code System

При первой оплате пользователь попадает на `/partner-code`. Код партнёра — 6 символов (A-Z2-9). Применяется через `POST /api/apply-partner-code`. Поле `partner_code` в таблице `users`.

### Gift Windows

Generated by `buildWindows(start, end, windowDays)` in `api/_lib/gift-windows.js`. Tariff 490: every 15 days. Tariff 1190: every 30 days. Admin grants bypass tariff check. Stored in `data/gifts/{telegram_id}.json`.

### Nearest Store

`POST /api/nearest-store` — accepts `{ address }` or `{ lat, lon }`. Geocodes address via `api/_lib/geocoder.js` (**Yandex Geocoder API**, `YANDEX_GEOCODER_API_KEY` + `CITY_NAME` + `CITY_BBOX` из env), then finds nearest pickup by Haversine distance. Store list: `config/stores.json` (4 points in Kaliningrad: Gagarina, Soglasiya, Avtomobilnaya, Guryevsk). Each store has `{ id, name, address, lat, lon, affiliate }` — `affiliate` is the Frontpad affiliate ID used in orders.

`POST /api/address-suggest` — autocomplete адресов для формы доставки. Вызывает `geocoder.suggest(query, limit)`, фильтрует по `kind ∈ {street, house}` и `, Калининград,`. Используется в `CheckoutForm.js` с флагом `streetConfirmed` — nearest-store дёргается только после подтверждения улицы + заполнения дома.

### Profile Editing

- `PUT /api/update-profile` — юзер редактирует свой профиль. Авторизация — JWT (`Bearer` в `Authorization`). Принимает `first_name`, `last_name`, `middle_name`, `phone`. Нормализует телефон, проверяет уникальность в `users`, синхронизирует `web_credentials.phone` в Supabase, пишет в оба набора полей (`first_name/last_name/middle_name` и legacy `name`), инвалидирует файловый кэш.
- `POST /api/admin/update-user` — админ редактирует профиль любого юзера. Авторизация — admin токен (`api/_lib/admin-auth.js`). Принимает `telegram_id` + те же поля. Та же логика.
- UI: кнопка `✎` в Hero `ProfilePage.js` (режим `user`) и в карточке подписчика `AdminPage.js` (режим `admin`) — общий компонент `src/components/EditProfileModal.js`.

### Admin User Management

Admin endpoints beyond products:
- `GET/POST /api/admin/user-tags` — read or modify user tags (derived from `tariff` + `is_ambassador`). Actions: add/remove. Invalidates user file cache.
- `POST /api/admin/add-user-manual` — create or update user by phone; if phone matches existing user, updates their subscription; otherwise creates `web_{phone}` user.
- `GET/PUT /api/admin/pricing` — GET is public (frontend loads prices); PUT requires admin auth. Prices stored in `data/products/pricing.json`.
- `POST /api/admin/set-subscription` — set tariff + end date in one request (used by datepicker in admin subscribers tab).
- `POST /api/admin/extend-subscription` — extend subscription end date by N days.
- `GET /api/admin/gift-orders` — list claimed gift orders.
- `POST /api/admin/add-product` — add a new product to a catalog (saves to `data/products/` override).
- `POST /api/admin/user-notes` — save/update free-text notes on a user (`notes` column in `users`).
- `GET /api/admin/referrals` — топ рефереров + история начислений SHC (вкладка «Рефералы» в админке).
- `GET /api/upsell-items` — публичный, возвращает товары-допродажи (из `data/products/upsell.json`) найденные по SKU во всех 10 каталогах.
- `POST /api/admin/upsell-toggle` — добавить/убрать SKU из списка допродаж (макс 6). Admin auth.
- `POST /api/admin/upsell-clear` — очистить список допродаж. Admin auth.

### Upsell (допродажи в корзине)

`data/products/upsell.json` — массив SKU, персистентный в Docker volume. Показываются в `<UpsellBlock />` внутри `CartPanel.js` (до 4 товаров, исключая уже добавленные в корзину). `UpsellBlock` принимает `onAddItem` через props — он должен быть передан из родительской страницы, иначе блок не появится. Управляются из вкладки **«◈ Допродажи»** в AdminPage (отдельная вкладка, добавлена в апреле 2026) — кнопки ☆/★ в списке товаров. **Важно**: SKU ищутся во всех 10 каталогах (не только в 3) — баг был именно в этом.

### Promo Gifts & Threshold Gifts (подарочные роллы по промокоду и порогу)

`GET /api/gift-items` — публичный, возвращает два списка товаров-подарков:
- `promoGifts` — товары из `data/products/promo-gifts.json` (промокод `102030`, заказ от 2000 ₽)
- `thresholdGifts` — товары из `data/products/threshold-gifts.json` (автоподарок при заказе от 2500 ₽)

Оба файла хранят `{ items: [SKU, ...] }`. SKU ищутся во всех 10 каталогах (та же логика что в upsell). Управляются из вкладки **«◈ Допродажи»** в AdminPage. Добавляются в корзину как бесплатные позиции (price=0 или price=1) через `CheckoutForm.js`.

Логика применения (фронт, `DiscountShopPage.js`/`CheckoutForm.js`):
- **Промокод 102030** — пользователь вводит в поле → если сумма ≥ 2000 ₽, в корзину добавляется один товар из `promoGifts` бесплатно
- **Порог 2500 ₽** — автоматически при достижении суммы корзины 2500 ₽ → добавляется один товар из `thresholdGifts`

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
YANDEX_GEOCODER_API_KEY                 # Geocoder for address autocomplete + nearest store
CITY_NAME                               # City filter for Yandex Geocoder (e.g. "Калининград")
CITY_BBOX                               # Bounding box for geocoder results
```

## Deployment

Docker Compose: `app` (Node 20-alpine, port 3001) + `nginx` (reverse proxy, SSL) + `certbot`. Persistent volume `app-data` → `/app/data` (SQLite, caches, admin overrides, banners).

Domain: `https://sushi-house-39.ru`. VPS: `ssh root@64.188.63.249`.

**Dockerfile** копирует в прод-образ: `build/`, `api/`, `config/`, `public/`, `scripts/`, `server.js`. Разовые миграции через `docker exec miniapp-sushii-app-1 node /app/scripts/<name>.js` — например `backfill-names.js` уже запущен разово после добавления полей `first_name/last_name/middle_name`.

**Built-in cron**: `server.js` schedules `runSubscriptionCron()` daily at 10:00 UTC (13:00 MSK) via `setTimeout`. There is also an external HTTP endpoint `POST /api/cron-subscriptions` (requires `CRON_SECRET` header) for manual triggers.

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