# ✅ Supabase настроен!

## 🎉 Что сделано

### 1. **Созданы файлы интеграции**

| Файл | Назначение |
|------|------------|
| `api/_lib/supabase.js` | Supabase клиент |
| `api/_lib/auth.js` | JWT middleware |
| `api/auth/login.js` | Вход через email/пароль |
| `api/auth/register.js` | Регистрация через email/пароль |
| `api/auth/refresh.js` | Обновление JWT токена |
| `supabase/migration.sql` | Схема БД для Supabase |
| `.env` | Переменные окружения |

### 2. **Обновлён server.js**

Добавлены роуты:
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
```

### 3. **Установлены зависимости**

```bash
npm install
```

Установлено:
- `@supabase/supabase-js` — клиент Supabase
- `bcrypt` — хэширование паролей
- `jsonwebtoken` — JWT токены
- `uuid` — генерация UUID

### 4. **Файлы скопированы на сервер**

Все файлы загружены на `sushi-house-39.ru`

---

## 📋 Что нужно сделать ВАМ

### ⚠️ ШАГ 1: Выполнить SQL миграцию в Supabase

1. Откройте **Supabase SQL Editor**:
   ```
   https://supabase.com/dashboard/project/qdmzkvjelmqszgioyryw/sql/new
   ```

2. Откройте файл `supabase/migration.sql` (локально)

3. Скопируйте **всё содержимое** файла

4. Вставьте в SQL Editor и нажмите **Run**

5. Проверьте, что созданы 5 таблиц:
   - users
   - payments
   - transactions
   - referral_bonuses
   - gift_windows

---

### ⚠️ ШАГ 2: Проверьте .env на сервере

Файл `.env` уже загружен на сервер с вашими ключами.

**Проверьте:**
```bash
ssh root@sushi-house-39.ru
cat /root/miniapp-sushii/.env
```

Должно быть:
```env
SUPABASE_URL=https://qdmzkvjelmqszgioyryw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=...
```

---

### ⚠️ ШАГ 3: Протестируйте API

#### Тест регистрации:

```bash
curl -X POST https://sushi-house-39.ru/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Тест"
  }'
```

Ожидаемый ответ:
```json
{
  "success": true,
  "userId": "web_...",
  "email": "test@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "..."
}
```

#### Тест входа:

```bash
curl -X POST https://sushi-house-39.ru/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

---

### ⚠️ ШАГ 4: Проверьте логи

```bash
ssh root@sushi-house-39.ru
docker logs miniapp-sushii-app-1 -f
```

Ищите:
```
[auth/register] Успешная регистрация: { telegram_id: 'web_...', email: 'test@example.com' }
```

---

## 🔄 Гибридный режим работы

### Telegram пользователи (старые)
- **Где:** SQLite
- **ID:** `telegram_id` (число)
- **Аутентификация:** `window.Telegram.WebApp`

### Веб пользователи (новые)
- **Где:** Supabase
- **ID:** `telegram_id` (строка `web_...`)
- **Аутентификация:** JWT токен

### Преимущества:
- ✅ Старые пользователи работают без изменений
- ✅ Новые пользователи могут регистрироваться через email
- ✅ Данные синхронизируются между SQLite и Supabase

---

## 📊 Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    Клиент (React)                        │
├─────────────────────────────────────────────────────────┤
│  UserContext                                             │
│  ├── Telegram WebApp → SQLite                           │
│  ├── JWT токен → Supabase                               │
│  └── URL параметр → SQLite                              │
└─────────────────────────────────────────────────────────┘
                          │
                          │ /api/auth/*
                          │ /api/sync-user
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Сервер (Express)                       │
├─────────────────────────────────────────────────────────┤
│  /api/auth/login        → Supabase + bcrypt            │
│  /api/auth/register     → Supabase + bcrypt            │
│  /api/auth/refresh      → JWT refresh                  │
│  /api/sync-user         → SQLite или Supabase          │
└─────────────────────────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
┌─────────────────────┐   ┌─────────────────────┐
│   SQLite (local)    │   │  Supabase (cloud)   │
├─────────────────────┤   ├─────────────────────┤
│ Telegram пользователи│   │ Веб пользователи    │
│ Товары              │   │ Рефералы            │
│ Заказы (кэш)        │   │ Подписки            │
└─────────────────────┘   └─────────────────────┘
```

---

## 🎯 Следующие шаги

1. ✅ Выполнить SQL миграцию в Supabase
2. ✅ Протестировать регистрацию через API
3. ✅ Протестировать вход через API
4. ✅ Обновить фронтенд (UserContext.js)
5. ✅ Добавить формы логина/регистрации

---

## 📞 Если что-то пошло не так

### Ошибка: "Invalid API key"

1. Проверьте `.env` на сервере
2. Перепроверьте ключи в Supabase Dashboard

### Ошибка: "relation 'users' does not exist"

1. Выполните SQL миграцию в Supabase SQL Editor
2. Проверьте, что таблицы созданы

### Ошибка: "JWT secret not defined"

1. Проверьте `.env`
2. Должно быть: `JWT_SECRET=...`

---

## ✅ Чек-лист готовности

- [ ] SQL миграция выполнена в Supabase
- [ ] Таблицы созданы (5 штук)
- [ ] `.env` настроен на сервере
- [ ] Зависимости установлены (`npm install`)
- [ ] Приложение перезапущено (`docker-compose restart`)
- [ ] Тест регистрации прошёл
- [ ] Тест входа прошёл
- [ ] Логи чистые (нет ошибок)

---

**После выполнения всех шагов — приложение готово к работе!**
