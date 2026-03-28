# 📊 Анализ архитектуры Mini App и план миграции на веб-версию

## 🔍 Текущая архитектура

### 📁 Структура проекта

```
miniapp-sushii/
├── src/                    # React фронтенд (SPA)
│   ├── UserContext.js      # Контекст пользователя (Telegram-зависимый)
│   ├── App.js              # Роутинг по страницам
│   ├── LandingPage.js      # Лендинг с тарифами
│   ├── DiscountShopPage.js # Магазин для подписчиков
│   ├── ProfilePage.js      # Личный кабинет
│   ├── AdminPage.js        # Админ-панель
│   └── ...                 # Другие страницы
│
├── api/                    # Express бэкенд
│   ├── sync-user.js        # Синхронизация пользователя
│   ├── create-payment.js   # Платежи YooKassa
│   ├── register-referral.js# Реферальная система
│   ├── _lib/               # Библиотеки
│   │   ├── db.js           # SQLite база данных
│   │   ├── user-cache.js   # Кэш пользователей
│   │   └── frontpad.js     # Интеграция с Frontpad
│   └── admin/*.js          # Админ API
│
├── docker-compose.yml      # Docker оркестрация
├── nginx/default.conf      # Nginx конфиг
└── data/                   # SQLite + файлы товаров
```

### 🏗️ Технологический стек

| Компонент | Технология |
|-----------|------------|
| **Frontend** | React 19.1.1, React Router (custom) |
| **Backend** | Node.js, Express 5.2.1 |
| **Database** | SQLite (better-sqlite3) |
| **Web Server** | Nginx + Let's Encrypt |
| **Payments** | YooKassa API |
| **Integration** | Frontpad (учётная система) |
| **Deployment** | Docker, Docker Compose |

---

## ⚠️ Зависимости от Telegram

### 1. **UserContext.js** — Критическая зависимость

```javascript
// src/UserContext.js:9-14
const tgUser = useMemo(() => {
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;
  return user ? {
    id: String(user.id),
    name: [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
  } : null;
});
```

**Проблема:** `window.Telegram.WebApp` недоступен вне Telegram

**Решение:** Добавить поддержку email/телефон авторизации

---

### 2. **Аутентификация**

Текущая схема:
```
Telegram WebApp → initDataUnsafe.user.id → telegram_id → API /sync-user
```

**Для веба нужно:**
- Email/пароль или телефон + SMS
- JWT токены для сессий
- Cookies для хранения refresh token

---

### 3. **Платежи (create-payment.js)**

```javascript
// api/create-payment.js:43
const returnUrl = `https://sushi-house-39.ru/discount-shop?telegram_id=${telegram_id}&payment=success`;
```

**Проблема:** Возврат на `telegram_id` в URL

**Решение:** Заменить на `user_id` из вашей системы

---

### 4. **Реферальная система (register-referral.js)**

```javascript
// api/register-referral.js:14
const { telegram_id, invited_by } = req.body || {};
```

**Проблема:** Использует `telegram_id` как идентификатор

**Решение:** Добавить поле `referral_code` для веб-версии

---

### 5. **Frontend компоненты**

Файлы с зависимостями Telegram:

| Файл | Строка | Использование |
|------|--------|---------------|
| `src/UserContext.js` | 9-10 | `window.Telegram.WebApp.initDataUnsafe` |
| `src/ShopPage.js` | 78-79 | `window.Telegram.WebApp.initDataUnsafe` |
| `src/RollsPage.js` | 31, 35 | `window.Telegram.WebApp` |
| `src/SetsPage.js` | 34, 38 | `window.Telegram.WebApp` |
| `src/ProfilePage.js` | 259, 388, 478 | `window.Telegram.WebApp.openTelegramLink` |
| `src/ProductCard.js` | 40 | `window.Telegram.WebApp` |
| `src/Success.js` | 5 | `window.Telegram.WebApp` |

---

## 🚀 План миграции на веб-версию

### Этап 1: Система аутентификации (2-3 дня)

#### 1.1 База данных

```sql
-- api/_lib/db.js
ALTER TABLE users ADD COLUMN email TEXT UNIQUE;
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN created_at_web INTEGER;
```

#### 1.2 API авторизации

```javascript
// api/auth/register.js
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "Имя",
  "phone": "+79991234567",
  "referral_code": "optional"
}

// api/auth/login.js
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securepassword"
}
// Ответ: { token: "jwt", refreshToken: "..." }

// api/auth/refresh.js
POST /api/auth/refresh
{
  "refreshToken": "..."
}
```

#### 1.3 JWT Middleware

```javascript
// api/_lib/auth.js
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Неверный токен' });
  }
}

module.exports = { authMiddleware };
```

---

### Этап 2: Обновление UserContext (1-2 дня)

#### 2.1 Новый UserContext для веба

```javascript
// src/WebUserContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const WebUserContext = createContext(null);

export function WebUserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          setUser(decoded);
          syncUserData(decoded.userId);
        } else {
          refreshToken();
        }
      } catch (e) {
        localStorage.removeItem('auth_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('refresh_token', data.refreshToken);
      setUser(jwtDecode(data.token));
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <WebUserContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </WebUserContext.Provider>
  );
}
```

---

### Этап 3: Обновление страниц (2-3 дня)

#### 3.1 Страницы для обновления

| Страница | Изменения |
|----------|-----------|
| `LandingPage.js` | Добавить форму регистрации |
| `ProfilePage.js` | Убрать Telegram ссылки, добавить email/телефон |
| `DiscountShopPage.js` | Проверка авторизации через JWT |
| `AdminPage.js` | JWT авторизация для админа |

#### 3.2 Пример обновления LandingPage

```javascript
// src/LandingPage.js
function LandingPage() {
  const { user, login } = useWebUser();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (user) {
    // Перенаправление в магазин для авторизованных
    window.location.href = '/discount-shop';
    return null;
  }

  return (
    <div className="landing-page">
      {/* Тарифы */}
      <PricingSection onBuy={(tarif) => {
        if (user) {
          createPayment(tarif);
        } else {
          setShowAuthModal(true);
        }
      }} />
      
      {/* Модальное окно авторизации */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onLogin={login}
        />
      )}
    </div>
  );
}
```

---

### Этап 4: Обновление API (2-3 дня)

#### 4.1 Обновить sync-user.js

```javascript
// api/sync-user.js
const { authMiddleware } = require('./_lib/auth');

module.exports = async (req, res) => {
  // Для Telegram
  if (req.body.telegram_id) {
    // Текущая логика
    return handleTelegramSync(req, res);
  }
  
  // Для веба
  if (req.headers.authorization) {
    authMiddleware(req, res, () => {
      return handleWebSync(req, res, req.userId);
    });
  }
};
```

#### 4.2 Обновить create-payment.js

```javascript
// api/create-payment.js
const { authMiddleware } = require('./_lib/auth');

module.exports = async (req, res) => {
  // Поддержка обоих методов
  let userId;
  
  if (req.body.telegram_id) {
    userId = req.body.telegram_id;
  } else if (req.headers.authorization) {
    await authMiddleware(req, res, () => {
      userId = req.userId;
    });
  } else {
    return res.status(400).json({ error: 'Требуется telegram_id или JWT токен' });
  }
  
  // Остальная логика...
};
```

---

### Этап 5: Frontend для веба (3-5 дней)

#### 5.1 Новые компоненты

```
src/
├── components/
│   ├── AuthModal.js        # Модальное окно входа/регистрации
│   ├── LoginForm.js        # Форма входа
│   ├── RegisterForm.js     # Форма регистрации
│   └── PasswordReset.js    # Сброс пароля
├── pages/
│   ├── LoginPage.js        # Страница входа
│   ├── RegisterPage.js     # Страница регистрации
│   └── ResetPasswordPage.js # Сброс пароля
```

#### 5.2 Пример AuthModal

```javascript
// src/components/AuthModal.js
export default function AuthModal({ onClose, onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  
  return (
    <div className="auth-modal" onClick={onClose}>
      <div className="auth-modal__content" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onClose}>×</button>
        
        {mode === 'login' ? (
          <LoginForm 
            onSubmit={onLogin}
            onSwitch={() => setMode('register')}
          />
        ) : (
          <RegisterForm
            onSubmit={onLogin}
            onSwitch={() => setMode('login')}
          />
        )}
      </div>
    </div>
  );
}
```

---

### Этап 6: Реферальная система для веба (1-2 дня)

#### 6.1 Генерация реферальных кодов

```javascript
// api/generate-referral-code.js
const { getUser, upsertUser } = require('./_lib/db');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  const { user_id } = req.body;
  
  const user = getUser(user_id);
  if (!user.referral_code) {
    const code = uuidv4().slice(0, 8); // Короткий код
    upsertUser({ telegram_id: user_id, referral_code: code });
    user.referral_code = code;
  }
  
  return res.json({
    referral_code: user.referral_code,
    referral_url: `https://sushi-house-39.ru/?ref=${user.referral_code}`
  });
};
```

---

## 📋 Чек-лист миграции

### Бэкенд

- [ ] Добавить таблицу users новые колонки (email, password_hash, referral_code)
- [ ] Создать API `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`
- [ ] Добавить JWT middleware
- [ ] Обновить `sync-user.js` для поддержки JWT
- [ ] Обновить `create-payment.js` для поддержки JWT
- [ ] Обновить `register-referral.js` для работы с referral_code
- [ ] Добавить API для генерации реферальных ссылок
- [ ] Добавить API для сброса пароля

### Фронтенд

- [ ] Создать `WebUserContext.js`
- [ ] Создать компоненты `AuthModal`, `LoginForm`, `RegisterForm`
- [ ] Создать страницы `/login`, `/register`, `/reset-password`
- [ ] Обновить `LandingPage.js` для поддержки анонимных пользователей
- [ ] Обновить `ProfilePage.js` (email вместо Telegram)
- [ ] Обновить `DiscountShopPage.js` (JWT проверка)
- [ ] Обновить все компоненты с `window.Telegram.WebApp`
- [ ] Добавить роутинг (React Router)

### Инфраструктура

- [ ] Настроить HTTPS (уже есть)
- [ ] Настроить отправку email (SendGrid/Mailgun)
- [ ] Настроить SMS рассылки (Twilio/SMS.ru)
- [ ] Настроить резервное копирование БД
- [ ] Настроить мониторинг (Sentry)

---

## 🎯 Рекомендации

### ✅ Что оставить как есть

1. **SQLite** — работает хорошо для текущего масштаба
2. **Express API** — архитектура правильная
3. **Nginx + Docker** — отличная конфигурация
4. **Frontpad интеграция** — работает стабильно

### 🔄 Что нужно изменить

1. **Аутентификация** — добавить email/пароль + JWT
2. **UserContext** — поддержка обоих методов (Telegram + Web)
3. **Рефералка** — referral_code вместо telegram_id
4. **Платежи** — поддержка user_id вместо telegram_id

### ⛔ Что можно убрать

1. **Telegram WebApp SDK** — только для веб-версии
2. **initDataUnsafe** — не нужен для веба
3. **Telegram ссылки** — заменить на email/SMS

---

## 📊 Оценка времени

| Этап | Время | Сложность |
|------|-------|-----------|
| 1. Аутентификация (API) | 2-3 дня | Средняя |
| 2. UserContext | 1-2 дня | Низкая |
| 3. Обновление страниц | 2-3 дня | Средняя |
| 4. Обновление API | 2-3 дня | Средняя |
| 5. Frontend компоненты | 3-5 дней | Высокая |
| 6. Рефералка для веба | 1-2 дня | Низкая |
| 7. Тестирование | 2-3 дня | Средняя |
| **Итого** | **13-21 день** | |

---

## 🚀 Быстрый старт (MVP)

Если нужно быстро запустить веб-версию:

1. **Неделя 1:** Аутентификация + UserContext
2. **Неделя 2:** LandingPage + ProfilePage
3. **Неделя 3:** DiscountShopPage + платежи

**Остальное** — постепенно в процессе поддержки.

---

## 📞 Контакты для вопросов

По архитектуре и миграции обращайтесь к текущей документации:
- `docs/MIGRATION-FROM-SUPABASE.md` — миграция данных
- `docs/BACKUP-DB.md` — резервное копирование
- `INTEGRATION.md` — интеграции с внешними сервисами
