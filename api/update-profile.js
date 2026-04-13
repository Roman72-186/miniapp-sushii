// api/update-profile.js — Редактирование своего профиля (JWT auth)

const jwt = require('jsonwebtoken');
const {
  getUser,
  updateUserProfile,
  findUserByPhoneExceptId,
} = require('./_lib/db');
const { updateWebCredentialsPhone } = require('./_lib/supabase');
const { deleteUserCache } = require('./_lib/user-cache');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function normalizePhone(raw) {
  const nums = String(raw || '').replace(/\D/g, '');
  if (nums.length === 11 && nums.startsWith('8')) return '7' + nums.slice(1);
  if (nums.length === 11 && nums.startsWith('7')) return nums;
  if (nums.length === 10) return '7' + nums;
  return nums;
}

function sanitizeName(raw) {
  return String(raw || '').trim().slice(0, 100);
}

function isValidName(s) {
  if (!s) return false;
  // Буквы (любой алфавит), пробелы, дефис, апостроф. Длина 1..100
  return /^[\p{L}][\p{L}\s\-']{0,99}$/u.test(s);
}

module.exports = async (req, res) => {
  const allowedOrigins = ['https://sushi-house-39.ru', 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  // Авторизация через JWT
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  const token = authHeader.slice(7);
  let userId;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    userId = payload.userId;
  } catch (e) {
    return res.status(401).json({ error: 'Неверный токен' });
  }
  if (!userId) {
    return res.status(401).json({ error: 'Неверный токен' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

  // Валидация полей
  const first_name = sanitizeName(body.first_name);
  const last_name = sanitizeName(body.last_name);
  const middle_name = sanitizeName(body.middle_name);
  const rawPhone = body.phone;

  if (!isValidName(first_name)) {
    return res.status(400).json({ error: 'Укажите корректное имя' });
  }
  if (!isValidName(last_name)) {
    return res.status(400).json({ error: 'Укажите корректную фамилию' });
  }
  if (middle_name && !isValidName(middle_name)) {
    return res.status(400).json({ error: 'Некорректное отчество' });
  }

  const phone = normalizePhone(rawPhone);
  if (!/^7\d{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Телефон должен быть в формате +7XXXXXXXXXX' });
  }

  try {
    const currentUser = await getUser(userId);
    if (!currentUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const phoneChanged = currentUser.phone !== phone;

    // Проверка уникальности нового телефона (если изменился)
    if (phoneChanged) {
      const conflict = await findUserByPhoneExceptId(phone, userId);
      if (conflict) {
        return res.status(409).json({ error: 'Этот номер уже привязан к другому аккаунту' });
      }

      // Синхронизация с web_credentials в Supabase (старый телефон → новый)
      const wcResult = await updateWebCredentialsPhone(currentUser.phone, phone);
      if (wcResult.error) {
        console.error('[update-profile] web_credentials error:', wcResult.error);
        return res.status(500).json({ error: 'Не удалось обновить учётные данные' });
      }
    }

    // Обновление профиля в БД
    const updated = await updateUserProfile(userId, { first_name, last_name, middle_name, phone });

    // Инвалидация файлового кэша — следующий sync-user перечитает из БД
    try { await deleteUserCache(userId); } catch {}

    return res.status(200).json({
      success: true,
      user: {
        telegram_id: updated.telegram_id,
        name: updated.name,
        first_name: updated.first_name,
        last_name: updated.last_name,
        middle_name: updated.middle_name,
        phone: updated.phone,
      },
    });
  } catch (err) {
    console.error('[update-profile] error:', err);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
