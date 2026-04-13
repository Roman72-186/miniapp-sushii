---
date: 2026-04-13
tags: [session, checkout, revert, profile, edit, auth, rules]
---

# 2026-04-13 (2) — Откат checkout, редактирование профиля, фиксация standalone web app

## Что сделано

### 1. Откат изменений в корзине — заказы уходили не на те филиалы

Жалоба: заказы с улицы Багратиона и 4-й Окружной попадали «на Подписку» вместо правильных филиалов.

**Первая попытка** (`adeb90c`): откат только `src/components/CheckoutForm.js` к состоянию до `dbe72c5` — вернули логику «любой подарок → принудительный самовывоз».

**Вторая, полная** (`e6f4d46`): по запросу пользователя откатил 4 файла к состоянию **до 11.04** (парент `b67070c`):
- `src/components/CheckoutForm.js`
- `api/create-order.js`
- `api/sync-user.js`
- `src/UserContext.js`

Убрали: автозаполнение last_address/last_pickup_point, поле «Количество персон», сохранение адреса в БД, доставку для заказов с подарком. Колонки `last_address`/`last_pickup_point` в `users` оставил неиспользуемыми (безопасно). `db.js`/`db-pg.js` не трогал — там реферальные фиксы 12.04.

### 2. Расследование геокодера

После отката стало понятно, что checkout-коммиты не меняли affiliate-логику. Реальная причина:

| Адрес | Что геокодер возвращает | Haversine nearest |
|---|---|---|
| `Багратиона, 100` | Московский район, правильно | Автомобильная (1.3 км) вместо Гагарина (1.4 км) — разница 100 м по прямой |
| `4-я Окружная, 10` | «4-я Большая Окружная улица», **без номера дома** → координата центра улицы у границы Гурьевска | Гурьевск (3.4 км) |
| `ул. 4-я Окружная, 10` | «Адрес не найден» | affiliate пустой → Frontpad дефолт |

Проверил в БД (`orders`): состав товаров в реальных заказах корректный, SKU 1177/1050/1178/1215 (подписочные) нигде не протекали — значит «упало на Подписка» относится к филиалу Frontpad, а не к составу.

Ключевая находка: **`1177/1050/1178/1215` — это SKU товаров-тарифов в Frontpad** (то, что пишет `yookassa-webhook.js` при оплате подписки), а не affiliate-филиалы. Роль этих ID прояснил пользователь: 290→1177, 490→1050, 1390→1178.

Итог исследования: routing-баг не в checkout-коде, а в связке геокодер ↔ Haversine. Правила районов/улиц нужны отдельно — **задача отложена** (пользователь переключился на другое).

### 3. CLAUDE.md: фиксация что проект — standalone web app

Пользователь строго указал: «Мы ушли от Telegram полностью. Telegram ID — старые данные, постепенно не будут актуальны. Никогда больше не спрашивай про Telegram Web и инициализацию.»

Добавлена секция в самом верху CLAUDE.md (сразу после Language):
- `telegram_id` — legacy поле, не опираться на него в новых фичах
- Единственный auth — JWT через `api/_lib/auth.js`
- Новые юзеры: `web_{timestamp}_{random}` из `api/auth/set-password.js`
- Legacy-код в `sync-user.js` (обработка `tg_name`), `UserContext.js` (чтение Telegram SDK), `?telegram_id=` — не расширять, не ломать, постепенно удалится

Также обновлены в MEMORY:
- Создан `memory/feedback_no_telegram.md` — правило на будущие сессии
- Обновлена секция «Стратегия проекта» в `MEMORY.md`
- Из «Стек» убрано упоминание «Telegram Mini App (WebApp SDK)»

### 4. Фича: редактирование профиля пользователя + админки

Реализована целиком за одну сессию после согласования плана с architect-агентом.

**Backend:**
- Миграции в `api/_lib/db.js` и `db-pg.js`: `first_name`, `last_name`, `middle_name` (SQLite через try/catch, PG через `IF NOT EXISTS`).
- Функция `updateUserProfile(telegramId, data)` — direct UPDATE (не COALESCE), пишет во все 3 новые колонки + legacy `name = first_name + ' ' + last_name`.
- Функция `findUserByPhoneExceptId(phone, telegramId)` — проверка уникальности.
- Helper `updateWebCredentialsPhone(oldPhone, newPhone)` в `api/_lib/supabase.js` — транзакционная синхронизация таблицы `web_credentials` при смене телефона (с проверкой конфликтов).
- `api/sync-user.js` — прокидывает новые поля в `variables` файлового кэша.

**API ручки:**
- `PUT /api/update-profile` — юзер редактирует себя. JWT авторизация через `jsonwebtoken`. Валидация UNICODE имени (`/^[\p{L}][\p{L}\s\-']{0,99}$/u`), нормализация телефона (`/^7\d{10}$/`), проверка уникальности (409 Conflict), синхронизация `web_credentials`, инвалидация файлового кэша.
- `POST /api/admin/update-user` — админ редактирует любого. Авторизация через `api/_lib/admin-auth.js`. Та же логика для любого `telegram_id`.

**Frontend:**
- `src/components/EditProfileModal.js` — универсальная модалка с двумя режимами (`mode: 'user' | 'admin'`). 4 поля: Имя, Фамилия, Отчество, Телефон. Форматирование телефона `+7 (XXX) XXX-XX-XX` на лету.
- `src/ProfilePage.js` — кнопка `✎` в `pf-hero__name-row` рядом с именем и бейджем тарифа. Открывает модалку в режиме user, после сохранения → `sync(true)`.
- `src/AdminPage.js` — кнопка `✎` в карточке подписчика на вкладке «◈ Люди». Открывает модалку в режиме admin, после сохранения → `loadSubscribers()`.
- `src/UserContext.js` — поля `first_name/last_name/middle_name` проброшены в `profile`.
- `src/shop.css` — стили `.pf-hero__edit-btn` и полный набор `.edit-profile-modal__*` (slide-up на мобиле, центр на десктопе).

**Скрипт миграции:**
- `scripts/backfill-names.js` — разовая миграция существующих `name` → `first_name/last_name/middle_name` через сплит по пробелам. Поддерживает SQLite и PostgreSQL (по `USE_SUPABASE=true`).
- **На проде запущен**: размигрировано **218 из 259** пользователей (остальные 40 — без имени вообще).

**Dockerfile:**
- Добавил `COPY --from=build /app/scripts ./scripts` — раньше `scripts/` не копировался в прод-образ, из-за чего backfill пришлось `docker cp` вручную. Теперь разовые миграции через `docker exec miniapp-sushii-app-1 node /app/scripts/<name>.js`.

### 5. Обновление CLAUDE.md для новой фичи

После реализации точечно обновил CLAUDE.md (не переписывал с нуля — всё остальное было актуально):
- Убрал «Telegram Mini App» из заголовка Architecture (противоречило секции выше)
- Обновил список колонок `users` (добавил new fields)
- Переписал секцию User Identity — JWT первичен, остальное legacy
- Пометил `tg_name` в User Data Flow как legacy
- Добавил новую секцию `### Profile Editing` с описанием двух ручек и модалки
- Добавил `GET /api/admin/referrals` в Admin User Management (пропущенная ручка с прошлой сессии)
- Добавил в Deployment упоминание про `scripts/` в прод-образе

## Файлы изменены / созданы

### Откаты checkout
| Файл | Операция |
|---|---|
| `src/components/CheckoutForm.js` | `git checkout 0cc6f47 --` |
| `api/create-order.js` | `git checkout 0cc6f47 --` |
| `api/sync-user.js` | `git checkout 0cc6f47 --` (потом снова обновлён для фичи профиля) |
| `src/UserContext.js` | `git checkout 0cc6f47 --` (потом снова обновлён для фичи профиля) |

### Фича редактирования профиля
| Файл | Операция |
|---|---|
| `api/_lib/db.js` | миграция колонок + `updateUserProfile` + `findUserByPhoneExceptId` |
| `api/_lib/db-pg.js` | `ensureMigrations()` через IIFE + те же функции async |
| `api/_lib/supabase.js` | `updateWebCredentialsPhone` |
| `api/sync-user.js` | `first_name/last_name/middle_name` в cache variables |
| `api/update-profile.js` | новый — PUT, JWT |
| `api/admin-update-user.js` | новый — POST, admin auth |
| `server.js` | 2 новых роута |
| `src/UserContext.js` | поля в `profile` |
| `src/ProfilePage.js` | кнопка `✎` в Hero + модалка |
| `src/AdminPage.js` | кнопка `✎` в карточке + модалка |
| `src/components/EditProfileModal.js` | новый — универсальная модалка |
| `src/shop.css` | стили кнопки и модалки |
| `scripts/backfill-names.js` | новый — разовая миграция |
| `Dockerfile` | `COPY --from=build /app/scripts ./scripts` |

### Правила и память
| Файл | Что |
|---|---|
| `CLAUDE.md` | секция standalone web app + точечные апдейты по всей файле после реализации фичи |
| `memory/feedback_no_telegram.md` | новое правило на будущие сессии |
| `memory/MEMORY.md` | Стратегия, Стек |

## Коммиты

- `adeb90c` — revert: откат CheckoutForm к состоянию до dbe72c5
- `e6f4d46` — revert: полный откат checkout к состоянию 10.04
- `df23830` — feat: редактирование профиля (имя/фамилия/отчество/телефон) + админка
- `14324da` — chore: включить scripts/ в прод образ для одноразовых миграций

## Деплой

Оба отката + фича задеплоены на VPS успешно:
1. `e6f4d46` — контейнер пересобран, старт ok.
2. `df23830` — контейнер пересобран, старт ok, backfill запущен через `docker cp` + `docker exec`, обновил 218 пользователей в Supabase PostgreSQL.
3. `14324da` — контейнер пересобран со `scripts/` в образе, проверено `ls /app/scripts/`.

Эндпоинты проверены:
- `PUT /api/update-profile` без токена → 401
- `PUT /api/update-profile` с битым токеном → 401 «Неверный токен»
- `POST /api/admin/update-user` без токена → 401

## Решения

- **Телефон: проверка уникальности есть, UNIQUE constraint в БД — нет**. Причина: в базе могут быть старые дубликаты телефонов. Добавлять UNIQUE надо после аудита `SELECT phone, COUNT(*) FROM users GROUP BY phone HAVING COUNT(*) > 1`. Отложено в фазу 2.
- **OTP на смену телефона — тоже фаза 2.** Сейчас просто сохраняем новый номер. Если появится спам — добавим подтверждение через существующий OTP-механизм.
- **Legacy поле `name` не удаляется.** Продолжаем писать в него синхронно (`first_name + ' ' + last_name`). Слишком много чтений в существующем коде, миграция — отдельная задача.
- **`name_overridden` флаг НЕ добавлял.** Изначально планировал, чтобы `sync-user.js` не перезаписывал имя из `tg_name` после редактирования. Но раз проект уже не Telegram Mini App, этот кейс несуществен — старый sync-код остаётся как есть для легаси юзеров.
- **Роли пользователь/админ используют одну и ту же модалку** `EditProfileModal` через пропс `mode` — экономит код и держит UX консистентным.

## Открытые вопросы / что осталось

- **Delivery routing на нужные филиалы** — расследование показало, что проблема в Haversine vs бизнес-правилах районов. Не решено в этой сессии, лежит в «Срочно» в приоритетах. Нужны бизнес-правила от Юлии: какая улица в какой филиал.
- **Фаза 2 редактирования**: UNIQUE constraint на телефон, OTP на смену номера, лог изменений в отдельной таблице.
- **Проверка UX фичи руками**: пользователь ещё не тестировал — нужно пройти путь «Профиль → ✎ → сохранить» и «Админка → Люди → ✎ → сохранить».
