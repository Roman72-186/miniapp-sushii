---
tags: [integration, supabase, auth]
date: 2026-04-07
---

# Supabase веб-авторизация

> ⚠️ Supabase используется **только для паролей**. Основные данные пользователей — в [[база данных SQLite]].

## Зачем

Веб-пользователи (не через Telegram) могут войти по телефону + паролю.
Пароли хранятся в Supabase (таблица `web_credentials`), не в SQLite — изоляция.

## Переменные окружения

```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=   # backend, полный доступ
SUPABASE_ANON_KEY=      # browser client
```

Клиент: `api/_lib/supabase.js`

## Таблица `web_credentials`

| Поле | Описание |
|------|---------|
| `phone` | Нормализованный телефон `7XXXXXXXXXX` |
| (остальные поля) | Пароль в зашифрованном виде (Supabase Auth) |

## Поток веб-входа

```
1. POST /api/auth/login-by-phone
   → Проверяет phone в SQLite
   → Проверяет наличие пароля в Supabase (web_credentials)
   → Возвращает: hasPassword | requiresEmail | isNewUser

2a. Если пароль есть:
   POST /api/auth/login-with-password  →  JWT

2b. Если пароля нет:
   POST /api/auth/send-email-otp       →  OTP на email
   POST /api/auth/verify-otp           →  JWT
   POST /api/auth/set-password         →  сохранить пароль в Supabase

3. JWT хранится в localStorage['web_token']
   → UserContext декодирует, isWebUser = true
   → Сервер верифицирует через api/_lib/auth.js
```

## JWT-токен

Подписывается через `JWT_SECRET`.
Middleware: `api/_lib/auth.js` → `authMiddleware()`.
Устанавливает: `req.userId`, `req.userEmail`, `req.authMethod`.

Веб-ID пользователей: `web_TIMESTAMP_random` (например `web_1714041234_abc7d`).

## Связанные заметки
- [[авторизация — три источника идентификации]]
- [[база данных SQLite]]
