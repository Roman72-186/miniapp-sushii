// api/admin-update-user.js — Админ редактирует профиль любого пользователя

const {
  getUser,
  updateUserProfile,
  findUserByPhoneExceptId,
} = require('./_lib/db');
const { updateWebCredentialsPhone } = require('./_lib/supabase');
const { deleteUserCache } = require('./_lib/user-cache');
const { checkAuth } = require('./_lib/admin-auth');

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
  return /^[\p{L}][\p{L}\s\-']{0,99}$/u.test(s);
}

module.exports = async (req, res) => {
  const allowedOrigins = ['https://sushi-house-39.ru', 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  // Проверка админ-токена
  if (!checkAuth(req, res)) return;

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

  const targetId = String(body.telegram_id || '').trim();
  if (!targetId) {
    return res.status(400).json({ error: 'Укажите telegram_id' });
  }

  const first_name = sanitizeName(body.first_name);
  const last_name = sanitizeName(body.last_name);
  const middle_name = sanitizeName(body.middle_name);
  const phone = normalizePhone(body.phone);

  if (!isValidName(first_name)) {
    return res.status(400).json({ error: 'Укажите корректное имя' });
  }
  if (!isValidName(last_name)) {
    return res.status(400).json({ error: 'Укажите корректную фамилию' });
  }
  if (middle_name && !isValidName(middle_name)) {
    return res.status(400).json({ error: 'Некорректное отчество' });
  }
  if (!/^7\d{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Телефон должен быть в формате +7XXXXXXXXXX' });
  }

  try {
    const currentUser = await getUser(targetId);
    if (!currentUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const phoneChanged = currentUser.phone !== phone;

    if (phoneChanged) {
      const conflict = await findUserByPhoneExceptId(phone, targetId);
      if (conflict) {
        return res.status(409).json({ error: `Этот номер уже привязан к другому аккаунту (${conflict.name || conflict.telegram_id})` });
      }

      const wcResult = await updateWebCredentialsPhone(currentUser.phone, phone);
      if (wcResult.error) {
        console.error('[admin-update-user] web_credentials error:', wcResult.error);
        return res.status(500).json({ error: `Ошибка обновления web_credentials: ${wcResult.error}` });
      }
    }

    const updated = await updateUserProfile(targetId, { first_name, last_name, middle_name, phone });

    try { await deleteUserCache(targetId); } catch {}

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
    console.error('[admin-update-user] error:', err);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
