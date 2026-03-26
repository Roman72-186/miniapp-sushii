# Миграция данных из Supabase в SQLite

Этот скрипт переносит все данные из облачной базы Supabase в локальную SQLite базу данных.

## 📋 Что мигрируется

- **users** — пользователи (telegram_id, имена, тарифы, подписки)
- **payments** — история платежей
- **transactions** — транзакции комиссий амбассадоров
- **referral_bonuses** — бонусы за приглашённых рефералов

## 🔧 Подготовка

### 1. Установите зависимости

```bash
npm install @supabase/supabase-js better-sqlite3 dotenv
```

### 2. Настройте переменные окружения

Создайте файл `.env` (или дополните существующий):

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-or-service-key

# Или используйте service key для полного доступа
# SUPABASE_SERVICE_KEY=your-service-key
```

### 3. Получите ключи Supabase

1. Зайдите в панель управления Supabase: https://app.supabase.com
2. Выберите ваш проект
3. Перейдите в **Settings** → **API**
4. Скопируйте:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** или **service_role** key → `SUPABASE_KEY`

## 🚀 Запуск миграции

```bash
node scripts/migrate-from-supabase.js
```

### Что происходит при миграции:

1. ✅ Создаётся резервная копия существующей БД (если есть)
2. ✅ Создаются таблицы SQLite
3. ✅ Данные извлекаются из Supabase
4. ✅ Даты конвертируются в формат DD.MM.YYYY
5. ✅ Данные записываются в локальную БД
6. ✅ Выводится статистика миграции

## 📊 Проверка результатов

После миграции проверьте данные:

```bash
# Проверка базы данных
node check-db.js

# Или вручную через Node.js
node -e "const db=require('./api/_lib/db'); console.log(db.getAllUsers().slice(0,5));"
```

## 🔧 Возможные проблемы

### Ошибка: "relation 'users' does not exist"

**Причина:** Имена таблиц в Supabase отличаются.

**Решение:** Откройте `scripts/migrate-from-supabase.js` и измените названия таблиц в массиве `TABLES_TO_MIGRATE`:

```js
const TABLES_TO_MIGRATE = [
  'users',        // ваше название таблицы пользователей
  'payments',     // ваше название таблицы платежей
  // ...
];
```

### Ошибка: "Invalid API key"

**Причина:** Неверный ключ Supabase.

**Решение:**
1. Проверьте, что используете правильный ключ (anon или service_role)
2. Убедитесь, что ключ активен в панели Supabase

### Ошибка: "Network request failed"

**Причина:** Проблемы с подключением к Supabase.

**Решение:**
1. Проверьте интернет-соединение
2. Убедитесь, что URL правильный (https://...)
3. Проверьте, что проект Supabase активен

## 📦 Структура данных

### Таблица `users`

| Поле | Тип | Описание |
|------|-----|----------|
| telegram_id | TEXT | ID пользователя Telegram (PRIMARY KEY) |
| name | TEXT | Имя пользователя |
| phone | TEXT | Номер телефона |
| tariff | TEXT | Тариф (290, 490, 1190, 9990) |
| invited_by | TEXT | ID пригласившего (реферер) |
| balance_shc | REAL | Баланс SHC |
| is_ambassador | INTEGER | Флаг амбассадора (0/1) |
| subscription_status | TEXT | Статус подписки (активно/неактивно) |
| subscription_start | TEXT | Дата начала (DD.MM.YYYY) |
| subscription_end | TEXT | Дата окончания (DD.MM.YYYY) |
| payment_method_id | TEXT | ID платёжного метода |
| ref_url | TEXT | Реферальная ссылка |
| watbot_contact_id | TEXT | ID контакта в WatBot |
| created_at | TEXT | Дата создания |
| updated_at | TEXT | Дата обновления |

### Таблица `payments`

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | ID платежа (PRIMARY KEY) |
| telegram_id | TEXT | ID пользователя |
| tariff | TEXT | Тариф |
| amount | REAL | Сумма |
| months | INTEGER | Количество месяцев |
| yookassa_payment_id | TEXT | ID платежа в ЮKassa |
| status | TEXT | Статус (succeeded/pending/canceled) |
| created_at | TEXT | Дата создания |

### Таблица `transactions`

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | ID транзакции |
| ambassador_id | TEXT | ID амбассадора |
| referral_id | TEXT | ID реферала |
| payment_id | INTEGER | ID платежа |
| payment_amount | REAL | Сумма платежа |
| commission_amount | REAL | Сумма комиссии |
| commission_percent | REAL | Процент комиссии |
| level | INTEGER | Уровень (1 или 2) |
| created_at | TEXT | Дата создания |

### Таблица `referral_bonuses`

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | ID бонуса |
| user_id | TEXT | ID пользователя |
| referral_id | TEXT | ID реферала |
| base_amount | REAL | Базовый бонус (50 SHC) |
| threshold_bonus | REAL | Бонус за порог |
| total_amount | REAL | Итоговая сумма |
| friends_count | INTEGER | Количество друзей |
| achievement | TEXT | Достижение |
| created_at | TEXT | Дата создания |

## 🧹 Очистка

После успешной миграции и проверки:

```bash
# Удалить резервную копию (если всё работает)
rm data/sushii.backup.db

# Или оставить для безопасности
```

## 📝 Примечания

- Скрипт создаёт резервную копию перед миграцией
- Даты конвертируются в формат DD.MM.YYYY
- При конфликте telegram_id данные перезаписываются (INSERT OR REPLACE)
- Миграция не удаляет данные из Supabase (только чтение)

## 🆘 Поддержка

При возникновении проблем:
1. Проверьте логи скрипта
2. Убедитесь, что таблицы в Supabase существуют
3. Проверьте права доступа API ключа
4. Обратитесь к администратору проекта
