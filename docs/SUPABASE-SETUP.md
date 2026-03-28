# 🚀 Настройка Supabase — Пошаговая инструкция

## ✅ Шаг 1: Выполните SQL миграцию

1. Откройте **Supabase SQL Editor**:
   ```
   https://supabase.com/dashboard/project/qdmzkvjelmqszgioyryw/sql/new
   ```

2. Скопируйте содержимое файла `supabase/migration.sql`

3. Вставьте в SQL Editor и нажмите **Run**

4. Проверьте, что все таблицы созданы:
   - Перейдите в **Table Editor**
   - Должны быть таблицы: `users`, `payments`, `transactions`, `referral_bonuses`, `gift_windows`

---

## ✅ Шаг 2: Установите зависимости

```bash
cd c:\Users\User\Desktop\Project\miniapp-sushii
npm install
```

Установятся:
- `@supabase/supabase-js` — клиент Supabase
- `bcrypt` — хэширование паролей
- `jsonwebtoken` — JWT токены
- `uuid` — генерация UUID

---

## ✅ Шаг 3: Проверьте .env

Файл `.env` уже создан с вашими ключами:

```env
SUPABASE_URL=https://qdmzkvjelmqszgioyryw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-...
```

**Важно:** Замените `JWT_SECRET` на случайную строку!

---

## ✅ Шаг 4: Тестирование подключения

### 4.1 Тест SQL миграции

Проверьте в Supabase Dashboard:
```
https://supabase.com/dashboard/project/qdmzkvjelmqszgioyryw/editor
```

Должны быть 5 таблиц:
- ✅ users
- ✅ payments
- ✅ transactions
- ✅ referral_bonuses
- ✅ gift_windows

### 4.2 Тест API (локально)

```bash
# Запустите сервер
npm start

# В другом терминале проверьте авторизацию
curl -X POST http://localhost:3001/api/auth/register \
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

### 4.3 Тест входа

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

---

## ✅ Шаг 5: Проверка Supabase Dashboard

### 5.1 Authentication → Users

Перейдите:
```
https://supabase.com/dashboard/project/qdmzkvjelmqszgioyryw/auth/users
```

После регистрации пользователя через API, он **НЕ** появится в Authentication → Users, потому что мы используем свою систему аутентификации (JWT + SQLite/Supabase DB).

**Примечание:** Если хотите использовать встроенную аутентификацию Supabase, нужно будет изменить код.

### 5.2 Table Editor

Перейдите:
```
https://supabase.com/dashboard/project/qdmzkvjelmqszgioyryw/editor
```

Проверьте:
- ✅ Таблица `users` существует
- ✅ После регистрации пользователь появляется в таблице

---

## ✅ Шаг 6: Гибридный режим (SQLite + Supabase)

По умолчанию приложение работает в **гибридном режиме**:

| Данные | Где хранятся |
|--------|--------------|
| Пользователи (email/пароль) | Supabase |
| Пользователи (Telegram) | SQLite |
| Товары | SQLite / Файлы |
| Заказы | SQLite |
| Рефералы | Supabase |
| Подписки | Supabase + SQLite |

### Преимущества:

- ✅ Быстрая миграция — не нужно переносить все данные
- ✅ Надёжность — Supabase для критичных данных
- ✅ Скорость — SQLite для кэша и товаров
- ✅ Обратная совместимость — Telegram пользователи работают как раньше

---

## ✅ Шаг 7: Обновление sync-user.js для Supabase

Файл `api/sync-user.js` теперь поддерживает оба режима:

```javascript
// Для Telegram пользователей (SQLite)
{
  "telegram_id": "123456789",
  "auth_method": "telegram"
}

// Для веб-пользователей (Supabase + JWT)
{
  "user_id": "web_...",
  "auth_method": "jwt",
  "Authorization": "Bearer <token>"
}
```

---

## 🔧 Устранение проблем

### Ошибка: "Invalid API key"

**Причина:** Неверный ключ Supabase

**Решение:**
1. Проверьте `.env`
2. Перепроверьте ключи в Dashboard:
   ```
   https://supabase.com/dashboard/project/qdmzkvjelmqszgioyryw/settings/api
   ```

### Ошибка: "relation 'users' does not exist"

**Причина:** SQL миграция не выполнена

**Решение:**
1. Откройте SQL Editor
2. Выполните `supabase/migration.sql`

### Ошибка: "JWT secret not defined"

**Причина:** Не установлен `JWT_SECRET`

**Решение:**
```bash
# В .env добавьте
JWT_SECRET=$(openssl rand -hex 32)
```

---

## 📊 Мониторинг

### Логи Supabase

```
https://supabase.com/dashboard/project/qdmzkvjelmqszgioyryw/logs/explorer
```

### Логи приложения

```bash
# На сервере
ssh root@sushi-house-39.ru
docker logs miniapp-sushii-app-1 -f
```

---

## 🎯 Следующие шаги

1. ✅ Выполнить SQL миграцию в Supabase
2. ✅ Установить зависимости (`npm install`)
3. ✅ Протестировать регистрацию/вход
4. ✅ Обновить фронтенд (UserContext.js)
5. ✅ Протестировать гибридный режим

---

## 📞 Контакты

При возникновении проблем:
1. Проверьте логи Supabase
2. Проверьте логи приложения
3. Убедитесь, что `.env` настроен правильно
