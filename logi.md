# Лог изменений — miniapp-sushii

---

## 2026-04-01 — Аудит архитектуры + уборка проекта

### Архитектура проекта (актуальное состояние)

**Стек:**
- React 19 (CRA) + plain CSS — фронтенд, SPA, роутинг через `window.location.pathname`
- Express 5.2.1 — бэкенд на порту 3001
- SQLite (better-sqlite3) — **единственная БД**, файл `data/sushii.db`
- Nginx — reverse proxy, SSL (Let's Encrypt через certbot)
- Docker Compose — оркестрация `app` + `nginx` + `certbot`
- YooKassa — обработка платежей подписок
- Frontpad — POS-система для заказов
- Telegram WebApp SDK — основной клиент

**Структура корня (после уборки):**
```
miniapp-sushii/
├── api/              # 44 REST-эндпоинта + _lib/ (12 утилит)
├── src/              # React SPA: страницы, компоненты, хуки, утилиты
├── public/           # Статика: JSON-каталоги, картинки, баннеры, admin HTML
├── scripts/          # Полезные скрипты: бэкап, миграция, синхронизация
├── docs/             # Документация проекта
├── nginx/            # Конфиг nginx
├── config/           # stores.json — координаты магазинов
├── supabase/         # migration.sql — схема зеркала Supabase
├── data/             # Runtime: sushii.db, users/, gifts/, products/, banners/
├── _archive/         # Устаревшие файлы (git ignored)
├── server.js         # Express: маршруты, статика, cron
├── package.json
├── Dockerfile
├── docker-compose.yml
├── CLAUDE.md
└── logi.md
```

**Ключевые паттерны:**
- `api/_lib/db.js` — все операции с SQLite
- `api/_lib/auth.js` — JWT (7 дней), `generateToken()` / `verifyToken()`
- `api/_lib/frontpad.js` — создание заказов в Frontpad
- `api/_lib/gift-windows.js` — `buildWindows(start, end, days)` для подарочных периодов
- `src/UserContext.js` — глобальный state: `telegramId`, `tarif`, `phone`, `profile`, `sync()`
- Express static priority: `data/banners/` > `data/products/` > `build/`

**Тарифы (Frontpad ID):** 290→1177, 490→1050, 1190→1178, 9990→1215

---

### Проблемы, решённые в этой сессии

#### 1. Веб-вход по телефону не работал

**Симптом:** После ввода телефона `+79227876678` страница снова показывала кнопку "Войти по номеру телефона".

**Причины (две независимые):**

**Причина 1 — Дублирующаяся запись в БД:**
При предыдущей попытке входа система создала запись `web_1774980564756_my244s0` с тем же телефоном, но без подписки. `SELECT ... WHERE phone = ?` возвращала эту пустую запись вместо настоящей (`5444227047`, тариф 490).
**Фикс:** удалили дубликат через `docker exec -it`.

**Причина 2 — JWT base64 декодирование (`UserContext.js`):**
`atob()` в браузере принимает только стандартный base64 (`+`, `/`), но JWT использует URL-safe base64 (`-`, `_`). Если payload содержал имя вроде "ЧАТ-БОТОВ" — `atob()` бросал исключение, `decodeJwt()` возвращала `null`, `webAuth = null`, `telegramId = null`.

**Фикс** в `src/UserContext.js`:
```js
// Было:
return JSON.parse(atob(payload));
// Стало:
const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
return JSON.parse(atob(base64));
```

**Коммит:** `b10b3e8` — "fix: исправлено декодирование JWT URL-safe base64 в браузере"

---

#### 2. Заголовок вкладки браузера и иконка

**Было:** "React App" + favicon.ico (стандартный)
**Стало:** "Суши Хаус Калининград" + logo.jpg

**Изменено** в `public/index.html`:
```html
<title>Суши Хаус Калининград</title>
<link rel="icon" href="%PUBLIC_URL%/logo.jpg" />
```

**Коммит:** `47c8836` — "fix: title и favicon → Суши Хаус Калининград"

---

#### 3. Веб-вход по телефону (`api/auth/login-by-phone.js`)

Новый файл для аутентификации веб-пользователей по номеру телефона (без Telegram):
- Ищет пользователя в SQLite по нормализованному телефону
- Если не найден → создаёт новую запись с `id = web_{timestamp}_{random}`
- Возвращает `{ success, token, userId, tarif, isExistingUser }`
- JWT подписывается `JWT_SECRET`, срок 7 дней

**Зарегистрирован** в `server.js`: `app.all('/api/auth/login-by-phone', ...)`

---

### Уборка проекта (2026-04-01)

**Удалены** (мусорные пустые файлы, случайно созданные в терминале):
```
(i+1)  console.error(e))  console.log('  console.log('Supabase
console.log(k  console.log(u.telegram_id  u.phone  {  server.log
```

**Перемещено в `_archive/scripts-old/`** (28 старых/тестовых скриптов из корня):
```
add-user-antnmndd.js   check-*.js (10 шт.)   compare-*.js (2 шт.)
create-test-user.js    create-user-from-watbot.js   export-all-users.js
find-correct-skus.js   list-active-users.js   list-all-users.js
restore-skus-from-api.js   stats.js   sync-all-watbot-users.js
sync-user-from-watbot.js   test-add-user.js   test-supabase.js
update-skus-manual.js   update-skus.js   update-user-db.js
update-user-subscription.js   find-subscribers.py   find-watbot-contact.py
```

**Перемещено в `_archive/deploy/`** (5 старых deploy-скриптов):
```
deploy.sh  deploy_final.sh  deploy_production.sh  deploy_script.sh  simple_deploy.sh
```

**Перемещено в `_archive/data/`** (бинарные и данные-файлы из корня):
```
frontpad-comparison.csv   image.png   nearest-store-integration.tar.gz
ФП скидки.csv   ФП скидки.xlsx
```

**Перемещено в `_archive/data/сеты-originals/`:**
Оригинальные фотографии сетов (30 шт., 2022–2023) из корня `сеты/`

**Перемещено в `docs/`** (документация из корня):
```
INTEGRATION.md   REFERRAL_SYSTEM.md   SUPABASE-READY.md
README-frontpad-comparison.md   AGENTS.md
```

**Перемещено в `_archive/`:**
```
coverage/  build-check/  vercel.json
```

**Обновлён `.gitignore`:**
- Добавлено `*.log` (чтобы `server.log` не попадал в git)
- Добавлено `/_archive` (архив хранится локально, не в git)

---

## 2026-03-31 — Supabase интеграция (база для зеркала)

- Создан `api/_lib/supabase.js` — клиент Supabase с `SUPABASE_SERVICE_KEY`
- Создан `scripts/migrate-to-supabase.js` — экспорт SQLite → Supabase
- Добавлен `supabase/migration.sql` — схема таблиц
- Обновлён `.env.example` с переменными Supabase

---

## 2026-03-16 — Удаление WATBOT, переход на чистый SQLite

- Удалён `api/_lib/watbot.js` — WATBOT больше не используется
- Удалены `api/migrate-subscribers.js`, `api/migrate-referrals.js`
- `scripts/final-sync-watbot.js` — финальная одноразовая синхронизация
- Все API теперь работают только с SQLite

---

## Лог до 2026-03-16 — Магазин /shop

## 2026-02-27 — Реализация полноценного магазина /shop

### Что сделано

Создан полноценный интернет-магазин на отдельной странице `/shop` с тёмной темой по образцу otnafani.ru. Каталог товаров загружается из Frontpad API, есть корзина, форма оформления заказа (доставка/самовывоз), отправка заказа в Frontpad + уведомление в Telegram. Существующие страницы (главная, /rolls, /sets) не затронуты.

---

### Новые файлы (6 шт.)

| Файл | Описание |
|------|----------|
| `api/create-order.js` | POST-эндпоинт для создания заказа. Принимает товары, данные клиента, тип доставки/оплаты. Создаёт заказ в Frontpad через `createOrder()`, параллельно шлёт уведомление в Telegram через WATBOT webhook. Возвращает `{ success, orderId, orderNumber }`. |
| `src/shop.css` | Все стили магазина — изолированы от App.css (префикс `.shop-`). Тёмная тема: фон `#1a1a1a`, карточки `#2a2a2e`, акцент `#3CC8A1`. Сетка 2 колонки (мобильные) / 4 колонки (десктоп). Фото 16:10, кнопки, корзина, форма, радио-кнопки, инпуты. |
| `src/components/ShopProductCard.js` | Карточка товара: горизонтальное фото, название (белый, bold), описание (серый), вес, цена + кнопка «Добавить». При добавлении — счётчик `[− N +]`. |
| `src/components/CartPanel.js` | Выдвижная панель корзины: список товаров (фото + название + счётчик + цена), «Очистить корзину», итого, кнопка «Оформить заказ». |
| `src/components/CheckoutForm.js` | Форма оформления: способ получения (Доставка/Самовывоз), время (Как можно скорей/Ко времени), оплата (Наличные/Карта), контакты (имя, телефон), адрес (только при доставке: улица, дом, кв., подъезд, этаж), комментарий. Кнопка «ЗАКАЗАТЬ: XXX ₽». POST на `/api/create-order`. |
| `src/ShopPage.js` | Главная страница магазина. Использует `useMenu()` для загрузки из Frontpad, `useCart()` для корзины. Фильтрует только 3 категории: Холодные роллы, Запеченные роллы, Сеты. Состояния: каталог → корзина → оформление → успех. |

### Изменённые файлы (2 шт.)

| Файл | Что изменено |
|------|-------------|
| `src/App.js` | Добавлен импорт `ShopPage`. Добавлена проверка `pathname === "/shop"` → ранний `return <ShopPage />` (до основного дерева). |
| `vercel.json` | Добавлен rewrite `{ "/shop" → "/index.html" }`. |

### Не затронуты

`App.css`, `RollsPage.js`, `SetsPage.js`, `ProductCard.js`, `data.js` — подписочные страницы работают без изменений.

---

### Переиспользованы существующие модули

- `api/frontpad.js` — `createOrder()` для отправки заказа в Frontpad
- `api/menu.js` — эндпоинт `/api/menu` для загрузки товаров
- `src/hooks/useFrontpad.js` — хуки `useMenu()`, `useCart()`
- `src/config/imageMap.js` — `getProductImage()` для фото товаров
- `src/utils/categories.js` — категоризация товаров

### Дизайн (тёмная тема по otnafani.ru)

- **Фон страницы**: `#1a1a1a`
- **Фон карточек/блоков**: `#2a2a2e`
- **Текст**: `#fff` (основной), `#999` (вторичный)
- **Акцент**: `#3CC8A1` (кнопки, радио, лейблы)
- **Карточки**: `border-radius: 14px`, фото `16:10`, `object-fit: cover`
- **Сетка**: мобильные 2 колонки, десктоп 4 колонки
- **Корзина**: выдвижная панель справа, бейдж с суммой в хедере
- **Форма**: тёмные инпуты, зелёные лейблы, кастомные радио-кнопки
- **Кнопка заказа**: большая зелёная, фиксирована внизу

---

### Как проверить

1. Открыть `/shop` — загружается каталог из Frontpad API
2. 3 категории в навигации: Холодные роллы, Запеченные, Сеты
3. Карточки в тёмной теме — фото, название, описание, цена, «Добавить»
4. Добавить товар → бейдж корзины в хедере (сумма + количество)
5. Нажать на корзину → список товаров, счётчики, «Очистить корзину», итого
6. «Оформить заказ» → форма с доставкой/самовывозом, оплатой, контактами
7. «ЗАКАЗАТЬ» → заказ в Frontpad + уведомление в Telegram
8. Страница успеха с номером заказа
9. Существующие страницы (`/`, `/rolls`, `/sets`) работают без изменений

---

## 2026-02-27 — Фикс: тёмная тема body

### Проблема
`App.css` задавал `body { background-color: #f5f5f5 }` (светлый), что перекрывало тёмный фон магазина — при скролле или за пределами `.shop-page` фон оставался светлым.

### Решение
- В `shop.css`: добавлен `body:has(.shop-page) { background: #1a1a1a !important }` + fallback `body.shop-body`
- В `ShopPage.js`: `useEffect` добавляет класс `shop-body` на `<body>` при монтировании, убирает при размонтировании
- Два уровня: CSS `:has()` (современные браузеры) + JS-класс (fallback)

---

## 2026-02-28 — Переход на локальные JSON + гамбургер-меню + пункты самовывоза

### Переход на локальные JSON-файлы
**Проблема**: Frontpad API медленно отвечал, товары загружались долго.
**Решение**: Каталог теперь загружается из 3 локальных JSON-файлов:
- `/холодные роллы/rolls.json` — 68 холодных роллов
- `/запеченные роллы/zaproll.json` — 30 запечённых роллов
- `/сеты/set.json` — 25 сетов

В `ShopPage.js` добавлен хук `useLocalMenu()` — загружает все 3 JSON параллельно через `Promise.all`.

### Фикс: ё/е в imageMap
**Проблема**: JSON-файлы содержат `Запечённый` (с ё), а ключи в `imageMap.js` — `запеченный` (с е). Товары не находили свои изображения.
**Решение**: В `normalizeName()` добавлена замена `ё → е` и `э → е`.

### Гамбургер-меню
**Проблема**: Горизонтальная навигация по категориям неудобна в мини-аппе.
**Решение**: Заменена на кнопку-гамбургер в хедере + выпадающее меню с оверлеем. Пункты: «Всё меню», «Холодные роллы», «Запеченные роллы», «Сеты».

### Секции категорий
При показе «Всё меню» товары группируются по категориям с заголовками-секциями.

### Пункты самовывоза в CheckoutForm
Добавлены 3 пункта самовывоза (взяты из `Delivery.js`):
- ул. Ю.Гагарина, д. 16Б (10:00–22:00)
- ул. Согласия, д. 46 (10:00–22:00)
- ул. Автомобильная, д. 12Б (10:00–22:00)

При выборе «Самовывоз» — появляется выбор пункта (radio). Адрес пункта передаётся в `client.street` и в комментарий к заказу. В футере показывается выбранный адрес.

### Изменённые файлы
| Файл | Что изменено |
|------|-------------|
| `src/ShopPage.js` | `useLocalMenu()` вместо Frontpad API, гамбургер-меню, секции категорий |
| `src/components/CheckoutForm.js` | Добавлены пункты самовывоза с radio-группой |
| `src/config/imageMap.js` | Фикс `normalizeName()`: ё→е, э→е |
| `src/shop.css` | Стили гамбургер-меню, выпадающего меню, секций, `.shop-radio-hint` |
