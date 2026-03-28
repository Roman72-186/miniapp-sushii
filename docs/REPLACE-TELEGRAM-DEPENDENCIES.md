# 🔧 Замена зависимостей от Telegram

## 📋 Список всех зависимостей

### Frontend (15 файлов)

| Файл | Строки | Зависимость | Приоритет |
|------|--------|-------------|-----------|
| `src/UserContext.js` | 9-14 | `window.Telegram.WebApp.initDataUnsafe` | 🔴 Критично |
| `src/ShopPage.js` | 78-79 | `window.Telegram.WebApp.initDataUnsafe` | 🔴 Критично |
| `src/RollsPage.js` | 31, 35 | `window.Telegram.WebApp` | 🔴 Критично |
| `src/SetsPage.js` | 34, 38, 63 | `window.Telegram.WebApp` | 🔴 Критично |
| `src/ProfilePage.js` | 259, 388, 478, 485 | `window.Telegram.WebApp.openTelegramLink` | 🟡 Средне |
| `src/ProductCard.js` | 40 | `window.Telegram.WebApp` | 🟡 Средне |
| `src/Success.js` | 5 | `window.Telegram.WebApp` | 🟢 Низко |

### Backend (8 файлов)

| Файл | Зависимость | Приоритет |
|------|-------------|-----------|
| `api/sync-user.js` | `telegram_id` как основной ID | 🔴 Критично |
| `api/create-payment.js` | `telegram_id` в metadata | 🔴 Критично |
| `api/register-referral.js` | `telegram_id` для рефералов | 🔴 Критично |
| `api/get-profile.js` | `telegram_id` | 🟡 Средне |
| `api/get-referrals.js` | `telegram_id` | 🟡 Средне |
| `api/get-transactions.js` | `telegram_id` | 🟡 Средне |
| `api/claim-gift.js` | `telegram_id` | 🟡 Средне |
| `api/cancel-subscription.js` | `telegram_id` | 🟢 Низко |

---

## ✅ Решение 1: Универсальная аутентификация

### 1.1 Новый UserContext (гибридный)

**Файл:** `src/UserContext.js`

```javascript
// src/UserContext.js — Универсальный контекст пользователя

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  // 1. Пробуем получить из Telegram WebApp
  const tgUser = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const tg = window.Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user;
    return user ? {
      id: String(user.id),
      name: [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
      username: user.username,
    } : null;
  }, []);

  // 2. Пробуем получить из URL параметра
  const urlTelegramId = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('telegram_id');
  }, []);

  // 3. Пробуем получить из JWT токена (веб-авторизация)
  const [jwtUser, setJwtUser] = useState(null);
  
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          setJwtUser({
            id: decoded.userId,
            email: decoded.email,
            name: decoded.name,
          });
        } else {
          localStorage.removeItem('auth_token');
        }
      } catch (e) {
        localStorage.removeItem('auth_token');
      }
    }
  }, []);

  // 4. Приоритет: JWT > Telegram > URL
  const telegramId = jwtUser?.id || tgUser?.id || urlTelegramId || null;
  const authMethod = jwtUser ? 'jwt' : (tgUser ? 'telegram' : 'url');

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  const sync = useCallback((force = false) => {
    if (!telegramId) {
      console.log('[UserContext] ID отсутствует, пропускаем синхронизацию');
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);

    console.log('[UserContext] Синхронизация:', { 
      telegramId, 
      authMethod,
      force 
    });

    // Определяем тип авторизации для бэкенда
    const requestBody = authMethod === 'jwt' 
      ? { user_id: telegramId, auth_method: 'jwt' }
      : { telegram_id: telegramId, auth_method: authMethod };

    return fetch('/api/sync-user', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(authMethod === 'jwt' && {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        })
      },
      body: JSON.stringify({
        ...requestBody,
        force,
        tg_name: tgUser?.name || null,
      }),
    })
      .then(r => r.json())
      .then(resp => {
        if (resp.success && resp.data) {
          setUserData(resp.data);
          console.log('[UserContext] Данные обновлены:', resp.data.tarif);
        } else {
          console.warn('[UserContext] Ошибка синхронизации:', resp);
        }
      })
      .catch((err) => {
        console.error('[UserContext] Ошибка:', err.message);
      })
      .finally(() => setLoading(false));
  }, [telegramId, authMethod, tgUser]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPaymentReturn = params.get('payment') === 'success';
    sync(isPaymentReturn);
  }, [sync]);

  // Логин для веб-версии
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
      setJwtUser({
        id: data.userId,
        email,
        name: data.name,
      });
      // Синхронизируем данные после логина
      await sync(true);
    }
    return data;
  };

  // Логаут
  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    setJwtUser(null);
    setUserData(null);
  };

  const tarif = userData?.tarif || null;

  const hasTag = useCallback((tagName) => {
    return (userData?.tags || []).includes(tagName);
  }, [userData]);

  const contactId = userData?.contact?.id || null;
  const contactName = userData?.contact?.name || null;

  const phone = userData?.listItem?.telefon
    || userData?.variables?.phone
    || userData?.variables?.['телефон']
    || jwtUser?.phone
    || null;

  const listItemName = userData?.listItem?.name || null;

  const profile = useMemo(() => {
    if (!userData && !jwtUser) {
      return null;
    }
    const v = userData?.variables || {};

    return {
      name: jwtUser?.name || contactName,
      email: jwtUser?.email,
      phone,
      статусСписания: v['статусСписания'] || null,
      balance_shc: v['balance_shc'] || null,
      датаОКОНЧАНИЯ: v['датаОКОНЧАНИЯ'] || null,
      датаНачала: v['датаНачала'] || null,
      датаПодарка: v['датаПодарка'] || null,
      ref_url: v['ref_url'] || null,
      has_payment_id: !!v['PaymentID'],
      contact_id: contactId,
      authMethod,
    };
  }, [userData, jwtUser, contactName, phone, contactId, authMethod]);

  const value = useMemo(() => ({
    telegramId,
    loading,
    userData,
    sync,
    tarif,
    hasTag,
    contactId,
    contactName,
    phone,
    listItemName,
    profile,
    // Веб-методы
    login,
    logout,
    isAuthenticated: !!telegramId,
    authMethod,
  }), [telegramId, loading, userData, sync, tarif, hasTag, contactId, contactName, phone, listItemName, profile, authMethod]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
```

---

## ✅ Решение 2: Бэкенд с поддержкой JWT

### 2.1 JWT Middleware

**Файл:** `api/_lib/auth.js`

```javascript
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware для проверки JWT токена
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    req.authMethod = 'jwt';
    next();
  } catch (e) {
    console.error('[authMiddleware] Ошибка токена:', e.message);
    return res.status(401).json({ error: 'Неверный токен' });
  }
}

/**
 * Генерация JWT токена
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.telegram_id || user.id,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Генерация Refresh токена
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.telegram_id || user.id },
    JWT_SECRET + '_refresh',
    { expiresIn: '30d' }
  );
}

module.exports = {
  authMiddleware,
  generateToken,
  generateRefreshToken,
  JWT_SECRET,
};
```

---

### 2.2 API авторизации

**Файл:** `api/auth/login.js`

```javascript
const bcrypt = require('bcrypt');
const { getUser } = require('../_lib/db');
const { generateToken, generateRefreshToken } = require('../_lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  try {
    // Ищем пользователя по email (новое поле)
    const db = require('../_lib/db').getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ 
        error: 'Аккаунт не имеет пароля. Войдите через Telegram или восстановите пароль.' 
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.status(200).json({
      success: true,
      userId: user.telegram_id,
      email: user.email,
      name: user.name,
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('[auth/login] Ошибка:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
```

**Файл:** `api/auth/register.js`

```javascript
const bcrypt = require('bcrypt');
const { getUser, upsertUser } = require('../_lib/db');
const { generateToken, generateRefreshToken } = require('../_lib/auth');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { email, password, name, phone, referral_code } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  // Валидация email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Некорректный email' });
  }

  // Валидация пароля
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
  }

  try {
    const db = require('../_lib/db').getDb();
    
    // Проверяем существование пользователя с таким email
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Хэшируем пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Генерируем реферальный код
    const myReferralCode = uuidv4().slice(0, 8);

    // Создаём пользователя
    // telegram_id будет null для веб-пользователей
    const telegramId = 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    upsertUser({
      telegram_id: telegramId,
      email,
      password_hash: passwordHash,
      name: name || null,
      phone: phone || null,
      referral_code: myReferralCode,
    });

    // Если есть referral_code, привязываем к пригласившему
    if (referral_code) {
      const inviter = db.prepare('SELECT * FROM users WHERE referral_code = ?').get(referral_code);
      if (inviter) {
        // Устанавливаем invited_by
        db.prepare(`
          UPDATE users SET invited_by = ? 
          WHERE telegram_id = ? AND invited_by IS NULL
        `).run(inviter.telegram_id, telegramId);
      }
    }

    const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.status(201).json({
      success: true,
      userId: telegramId,
      email: user.email,
      name: user.name,
      referral_code: myReferralCode,
      referral_url: `https://sushi-house-39.ru/?ref=${myReferralCode}`,
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('[auth/register] Ошибка:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
```

**Файл:** `api/auth/refresh.js`

```javascript
const jwt = require('jsonwebtoken');
const { getUser } = require('../_lib/db');
const { generateToken, generateRefreshToken, JWT_SECRET } = require('../_lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { refreshToken } = req.body || {};

  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken обязателен' });
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET + '_refresh');
    const user = getUser(payload.userId);

    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    return res.status(200).json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (e) {
    console.error('[auth/refresh] Ошибка:', e.message);
    return res.status(401).json({ error: 'Неверный refresh токен' });
  }
};
```

---

### 2.3 Обновление sync-user.js

**Файл:** `api/sync-user.js` (фрагмент)

```javascript
const { authMiddleware } = require('./_lib/auth');

module.exports = async (req, res) => {
  // ... existing code ...

  const { telegram_id, user_id, auth_method, force, tg_name } = req.body || {};
  
  // Поддержка обоих типов авторизации
  const userId = user_id || telegram_id;
  
  if (!userId) {
    // Проверяем JWT токен из заголовка
    if (req.headers.authorization) {
      return new Promise((resolve) => {
        authMiddleware(req, res, () => {
          req.body.telegram_id = req.userId;
          req.body.auth_method = 'jwt';
          resolve(handleSync(req, res));
        });
      });
    }
    
    return res.status(400).json({ error: 'telegram_id или user_id обязателен' });
  }

  return handleSync(req, res);
};

function handleSync(req, res) {
  const { telegram_id, user_id, auth_method, force, tg_name } = req.body || {};
  const userId = user_id || telegram_id;
  
  // ... rest of existing sync logic ...
  
  console.log('[sync-user] Авторизация:', {
    userId,
    auth_method: auth_method || 'telegram',
  });
  
  // ... existing code ...
}
```

---

## ✅ Решение 3: Замена Telegram UI функций

### 3.1 ProfilePage.js — замена share

**Было:**

```javascript
// src/ProfilePage.js:259-265
const tg = window.Telegram?.WebApp;
if (tg?.openTelegramLink) {
  tg.openTelegramLink(shareUrl);
} else {
  window.open(shareUrl, '_blank');
}
```

**Стало:**

```javascript
// src/ProfilePage.js
const shareLink = async () => {
  const text = 'Привет! Присоединяйся к Суши-Хаус 39 — вкусные роллы со скидкой по подписке 🍣';
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(profile.ref_url)}&text=${encodeURIComponent(text)}`;
  
  // Проверяем Telegram WebApp
  const tg = window.Telegram?.WebApp;
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(shareUrl);
  } else {
    // Для веба — используем Web Share API или fallback
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Суши-Хаус 39',
          text: text,
          url: profile.ref_url,
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      // Fallback — открываем в новой вкладке
      window.open(shareUrl, '_blank');
    }
  }
};
```

---

### 3.2 Компонент для шеринга

**Файл:** `src/components/ShareButton.js`

```javascript
import React from 'react';

export default function ShareButton({ url, text, title, className }) {
  const handleShare = async () => {
    // Проверяем Telegram WebApp
    const tg = window.Telegram?.WebApp;
    if (tg?.shareUrl) {
      tg.shareUrl(url, text);
      return;
    }

    // Web Share API (мобильные браузеры)
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        console.log('Share canceled');
      }
    }

    // Fallback — социальные сети
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <button className={className} onClick={handleShare}>
      Поделиться
    </button>
  );
}
```

---

## ✅ Решение 4: Обновление базы данных

### 4.1 Миграция БД

**Файл:** `scripts/add-web-auth-fields.js`

```javascript
const { getDb } = require('../api/_lib/db');

const db = getDb();

console.log('Добавление полей для веб-авторизации...');

db.exec(`
  -- Email для веб-пользователей
  ALTER TABLE users ADD COLUMN email TEXT UNIQUE;
  
  -- Хэш пароля
  ALTER TABLE users ADD COLUMN password_hash TEXT;
  
  -- Реферальный код для веба
  ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
  
  -- Метод авторизации
  ALTER TABLE users ADD COLUMN auth_method TEXT DEFAULT 'telegram';
  
  -- Верификация телефона
  ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0;
  
  -- Индексы для производительности
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
`);

console.log('✅ Поля добавлены');

// Генерируем referral_code для существующих пользователей
const users = db.prepare('SELECT * FROM users WHERE referral_code IS NULL').all();
const { v4: uuidv4 } = require('uuid');

console.log(`Генерация referral_code для ${users.length} пользователей...`);

for (const user of users) {
  const code = uuidv4().slice(0, 8);
  db.prepare('UPDATE users SET referral_code = ? WHERE telegram_id = ?').run(code, user.telegram_id);
}

console.log('✅ Готово');
```

---

## 📋 Чек-лист внедрения

### Этап 1: Подготовка (1 день)

- [ ] Установить зависимости: `npm install bcrypt jsonwebtoken uuid`
- [ ] Запустить миграцию БД: `node scripts/add-web-auth-fields.js`
- [ ] Добавить `JWT_SECRET` в `.env`

### Этап 2: Бэкенд (2 дня)

- [ ] Создать `api/_lib/auth.js`
- [ ] Создать `api/auth/login.js`
- [ ] Создать `api/auth/register.js`
- [ ] Создать `api/auth/refresh.js`
- [ ] Обновить `api/sync-user.js` для поддержки JWT
- [ ] Обновить `server.js` — добавить роуты `/api/auth/*`

### Этап 3: Фронтенд (2 дня)

- [ ] Установить: `npm install jwt-decode`
- [ ] Обновить `src/UserContext.js`
- [ ] Создать `src/components/AuthModal.js`
- [ ] Создать `src/components/LoginForm.js`
- [ ] Создать `src/components/RegisterForm.js`
- [ ] Обновить `src/ProfilePage.js` — замена `openTelegramLink`
- [ ] Обновить `src/Success.js` — убрать Telegram зависимость

### Этап 4: Тестирование (1 день)

- [ ] Тест регистрации через email
- [ ] Тест входа через email/пароль
- [ ] Тест JWT токена (refresh)
- [ ] Тест Telegram авторизации (обратная совместимость)
- [ ] Тест реферальной системы (веб)

---

## 🎯 Итоговая архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    Клиент (React)                        │
├─────────────────────────────────────────────────────────┤
│  UserContext                                             │
│  ├── Telegram WebApp (initDataUnsafe)                   │
│  ├── JWT токен (localStorage)                           │
│  └── URL параметр (telegram_id)                         │
└─────────────────────────────────────────────────────────┘
                          │
                          │ /api/sync-user
                          │ { telegram_id } или { user_id + JWT }
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Сервер (Express)                       │
├─────────────────────────────────────────────────────────┤
│  /api/auth/login        → JWT токен                     │
│  /api/auth/register     → JWT токен + referral_code     │
│  /api/auth/refresh      → новый JWT токен               │
│  /api/sync-user         → поддержка обоих методов        │
│  /api/create-payment    → поддержка обоих методов        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              База данных (SQLite)                        │
├─────────────────────────────────────────────────────────┤
│  users:                                                  │
│  - telegram_id (TEXT) — ID из Telegram или web_*        │
│  - email (TEXT) — для веба                              │
│  - password_hash (TEXT) — для веба                      │
│  - referral_code (TEXT) — для веба                      │
│  - auth_method (TEXT) — 'telegram' или 'web'            │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Зависимости для установки

```bash
npm install bcrypt jsonwebtoken uuid jwt-decode
```

---

## 🔐 Безопасность

1. **JWT_SECRET** — храните в `.env`, не в коде
2. **HTTPS** — обязательно для продакшена
3. **bcrypt rounds** — минимум 10 для хэширования паролей
4. **Token expiry** — 7 дней для access, 30 дней для refresh
5. **Rate limiting** — добавьте для `/api/auth/*` endpoints
