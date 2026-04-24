1# Инструкция по интеграции с WATBOT — miniapp-sushii

> **Контекст:** WATBOT — платформа чат-ботов (watbot.ru), которая ранее использовалась как основная CRM этого проекта. С 16 марта 2026 года WATBOT удалён из проекта как активный компонент. Ниже описан текущий статус интеграции, что осталось, и как работать с API при необходимости аналитики или рассылок.

---

## 1. Текущий статус

| Компонент | Статус |
|---|---|
| `api/_lib/watbot.js` | **Удалён** (16.03.2026) |
| `WATBOT_API_TOKEN` env | Не используется в коде — только в `.env` на VPS |
| `api/order.js` | **Остался** — содержит хардкоднутый webhook URL ватбота для уведомлений (НЕ трогать) |
| `users.watbot_contact_id` | **Поле осталось** в SQLite/PG — legacy, не заполняется у новых пользователей |
| Скрипты в `scripts/` | Остались как утилиты для разовой аналитики |

### `api/order.js` — что делает

Serverless-функция, принимает POST от фронта и пересылает данные заказа в webhook ватбота:

```
POST https://api.watbot.ru/hook/3679113:lNF976LZ8w7ok2w4LHOuxt1X9YqVNGKxbBFbi8uGlUCTyLV3
```

Тело: `{ telegram_id, product_id, product_name, price, code }`.

**Важно:** это НЕ REST API ватбота — это webhook URL конкретного сценария бота. URL жёстко вшит в файл. Не вызывается автоматически при оформлении подписок — только если фронт явно POST-ит на `/api/order`.

---

## 2. WATBOT API — как устроен

**Базовый URL:** `https://watbot.ru/api/v1`  
**Документация:** `https://docs.watbot.ru/rabota-s-api/kontakty`  
**Аутентификация:** параметр `api_token` в теле POST или query string GET.

**BOT_ID нашего бота:** `72975`  
**ID списка «Список Клиентов 1»:** `69a16dc23dd8ee76a202a802`

### Ключевые эндпоинты

#### Контакты (GET)

```
GET /api/v1/getContacts?api_token=<TOKEN>&bot_id=72975&count=500&page=1
```

**Ответ:**
```json
{
  "meta": { "total": 1522, "last_page": 4, "current_page": 1 },
  "data": [
    {
      "id": 6160280,
      "telegram_id": "859665890",
      "telegram_username": "mini_girl0_0",
      "name": "Имя контакта",
      "phone": null,
      "email": null,
      "bot_id": 72975,
      "messenger": "telegram",
      "created_at": "2024-12-01T10:00:00.000000Z",
      "variables": [
        { "name": "link", "value": "https://yoomoney.ru/checkout/..." },
        { "name": "phone", "value": "79114512345" },
        { "name": "tarif", "value": "290" }
      ]
    }
  ]
}
```

**Особенности:**
- Максимум 500 контактов на страницу (`count` параметр)
- Переменные контакта — массив `{ name, value }`, НЕ объект
- Для получения переменной: `variables.find(v => v.name === 'link')?.value`
- Rate limit: ~2 запроса/сек → задержка 300 мс между страницами обязательна

#### Списки (POST)

```
POST /api/v1/getListSchema
Body: { "api_token": "...", "schema_id": "69a16dc23dd8ee76a202a802" }
```

```
POST /api/v1/getListItems
Body: {
  "api_token": "...",
  "schema_id": "69a16dc23dd8ee76a202a802",
  "filters": { "tarif": "290" },
  "limit": 1000,
  "page": 1
}
```

**Ответ getListItems:** `{ "data": [{ "id_tg": "...", "telefon": "...", "tarif": "290" }] }`  
**Поля списка (slug-и):** `id_tg`, `telefon`, `tarif` — выяснены через `getListSchema`.

---

## 3. Утилитарные скрипты

Все в `scripts/`. Требуют `WATBOT_API_TOKEN` в `.env`.

### `fetch-watbot-list.js` — выгрузка из списка по тарифу

```bash
WATBOT_API_TOKEN=xxx node scripts/fetch-watbot-list.js [schema_id] [tarif]
# По умолчанию: schema=69a16dc23dd8ee76a202a802, tarif=290
```

Выводит JSON в stdout, логи в stderr. Пагинация автоматически. Если API-фильтр не работает — делает локальную фильтрацию по всем полям.

### `fetch-watbot-users-with-link.js` — контакты с заполненной переменной

```bash
node scripts/fetch-watbot-users-with-link.js [имя_переменной] [путь_к_файлу]
# По умолчанию: переменная="link", вывод в scripts/watbot-users-with-link.json
```

Читает все контакты через `getContacts` (пагинация), фильтрует по наличию переменной `link` (ссылка на YooMoney checkout). Всего контактов: ~1522, с `link`: ~536.

### `merge-watbot-with-db.js` — сопоставление списка с БД, вывод CSV

```bash
node scripts/merge-watbot-with-db.js > /tmp/merged-290.csv
# USE_SUPABASE=true — PostgreSQL, иначе SQLite
```

### `merge-watbot-link-with-db.js` — сопоставление контактов (с link) с БД

```bash
# На VPS:
docker exec miniapp-sushii-app-1 node /app/scripts/merge-watbot-link-with-db.js
# Вход:  /app/data/watbot-users-with-link.json (сначала запусти fetch-watbot-users-with-link.js)
# Выход: /app/data/watbot-link-merged.json
```

Разбивает на три корзины:
- `matched_not_active` — в БД, подписка неактивна (целевая группа для рассылки)
- `matched_active` — в БД, подписка активна (исключаются)
- `not_in_db` — в ватботе есть, в БД нет (382 из 536 — старые или web-юзеры)

### `inactive-from-watbot.js` — неактивные подписчики из списка 290

```bash
DATABASE_URL=postgresql://... WATBOT_API_TOKEN=xxx node scripts/inactive-from-watbot.js
```

Требует PostgreSQL (не SQLite). Сопоставляет список 290 с таблицей `users`, возвращает JSON с неактивными.

### `active-subs-from-watbot.js` — активные подписчики из списка 290

```bash
DATABASE_URL=postgresql://... WATBOT_API_TOKEN=xxx node scripts/active-subs-from-watbot.js > active.csv
```

Вывод CSV: `telegram_id, telefon_watbot, name, phone_db, tariff_db, subscription_status, ...`.

---

## 4. Аналитические данные (апрель 2026)

На момент последнего анализа (13 апреля 2026):

| Метрика | Значение |
|---|---|
| Всего контактов в ватботе | 1522 |
| Всего пользователей в нашей БД | 261 |
| Активных подписок в БД | 84 (290→31, 490→28, 1190→14) |
| Неактивных в БД | 177 (124 — ни разу не платили) |
| Ватбот-контакты с `link` | 536 |
| — из них: целевая группа (в БД, неактивные) | 98 |
| — из них: не найдены в БД | 382 (71%) |

**Почему 382 «не найдены в БД»:** большинство — старые контакты из ватбота, которые либо никогда не дошли до оплаты, либо перешли на web-регистрацию (`web_*` ID). В ватботе хранится `telegram_id`, а в БД этот пользователь создан уже как `web_...`. Можно попробовать сопоставить по телефону из `variables.phone` → `users.phone` — это не реализовано.

**Файл для рассылки:** `data/watbot-link-tg-only.json` (480 записей) — у каждого есть `telegram_id` и `link` (YooMoney checkout). Структура записи:

```json
{
  "id": 6160280,
  "telegram_id": "859665890",
  "telegram_username": "mini_girl0_0",
  "name": "Имя",
  "link": "https://yoomoney.ru/checkout/payments/v2/contract?orderId=...",
  "db": { "tariff": null, "subscription_status": "неактивно", "subscription_end": "04.01.2026" }
}
```

Поле `db` присутствует только у 98 записей. У 382 — `"reason": "not_found"`.

---

## 5. Паттерн рассылки через Telegram Bot API (не реализован, готов к написанию)

Если нужна рассылка по файлу `watbot-link-tg-only.json`:

```javascript
const data = require('./data/watbot-link-tg-only.json');
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

for (const contact of data.contacts) {
  const text = `Ваша ссылка на продление: ${contact.link}`;
  const res = await fetch(
    `https://api.telegram.org/bot${TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: contact.telegram_id, text })
    }
  );
  const r = await res.json();
  if (!r.ok) console.error(`FAIL ${contact.telegram_id}: ${r.description}`);
  await new Promise(r => setTimeout(r, 100)); // ~10 msg/sec
}
```

**Риски:**
- Часть из 382 «не в БД» — боты, заблокированные или удалённые аккаунты. Bot API вернёт `403 Forbidden` — нужна обработка ошибок.
- Бот должен иметь открытый диалог с пользователем (пользователь написал `/start`), иначе `403`.

---

## 6. Webhook ватбота (api/order.js)

URL хардкоднут в файле:

```
https://api.watbot.ru/hook/3679113:lNF976LZ8w7ok2w4LHOuxt1X9YqVNGKxbBFbi8uGlUCTyLV3
```

Это URL конкретного сценария в ватботе (не REST API). При POST туда — ватбот запускает сценарий для указанного `telegram_id`. Текущее использование: фронт вызывает `/api/order` для отправки уведомления через бота подписчику.

**Не трогать** — унаследованный webhook, его удаление или изменение нарушит уведомления для старых пользователей.

---

## 7. Env переменные

```bash
WATBOT_API_TOKEN=<токен из настроек бота на watbot.ru>
# BOT_ID = 72975 (хардкоднут в скриптах)
# TELEGRAM_BOT_TOKEN — отдельно, для прямых рассылок через Bot API
```

`WATBOT_API_TOKEN` задокументирован в `.env.example`, но `server.js` его не читает — только скрипты в `scripts/`.

---

## 8. Что НЕ делать

- **Не восстанавливать `api/_lib/watbot.js`** — проект полностью перешёл на JWT/веб-авторизацию
- **Не строить новые фичи на `watbot_contact_id`** — поле legacy, у новых пользователей не заполняется
- **Не добавлять sync через ватбот** — Telegram-зависимость удалена намеренно
- **Не вызывать `api/order.js` в новых сценариях** — webhook URL может протухнуть, нет гарантий доступности

---

## 9. Схема данных — список клиентов в ватботе

**Schema ID:** `69a16dc23dd8ee76a202a802` («Список Клиентов 1»)

Поля (slug → название):
- `id_tg` — Telegram ID пользователя
- `telefon` — телефон
- `tarif` — тариф подписки (`"290"`, `"490"`, `"1190"`)

В переменных контакта (`getContacts → variables`):
- `link` — ссылка на YooMoney checkout (последняя сессия оплаты)
- `phone` — телефон (дублирует поле `phone` контакта)
- `tarif` — тариф (дублирует поле в списке)

---

*Составлено на основе кода `scripts/`, `api/order.js` и сессионных заметок `obsidian-vault/sessions/2026-04-13*.md`. Актуально на апрель 2026.*
