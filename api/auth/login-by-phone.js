// api/auth/login-by-phone.js — Вход по номеру телефона (для веб-версии)
// Ищет пользователя в SQLite по phone, выдаёт JWT токен

const { getDb, upsertUser, getUser } = require('../_lib/db');
const { generateToken, generateRefreshToken } = require('../_lib/auth');

function normalizePhone(raw) {
  const nums = String(raw || '').replace(/\D/g, '');
  if (nums.length === 11 && nums.startsWith('8')) return '7' + nums.slice(1);
  if (nums.length === 11 && nums.startsWith('7')) return nums;
  if (nums.length === 10) return '7' + nums;
  return nums;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://sushi-house-39.ru');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { phone: rawPhone, name: rawName } = req.body || {};

  if (!rawPhone) {
    return res.status(400).json({ error: 'Укажите номер телефона' });
  }

  const phone = normalizePhone(rawPhone);

  if (!/^7\d{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Некорректный номер телефона. Формат: +7XXXXXXXXXX' });
  }

  try {
    const db = getDb();

    // Ищем существующего пользователя по телефону
    const existingUser = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);

    if (existingUser) {
      // Пользователь найден — выдаём JWT с его telegram_id
      const token = generateToken(existingUser);
      const refreshToken = generateRefreshToken(existingUser);

      console.log('[login-by-phone] Существующий пользователь:', existingUser.telegram_id);

      return res.status(200).json({
        success: true,
        userId: existingUser.telegram_id,
        name: existingUser.name || null,
        phone,
        tarif: existingUser.tariff || null,
        isExistingUser: true,
        token,
        refreshToken,
      });
    }

    // Пользователь не найден — создаём нового веб-пользователя
    const webId = 'web_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    const name = rawName ? String(rawName).trim() : null;

    upsertUser({ telegram_id: webId, phone, name });

    const newUser = getUser(webId);
    const token = generateToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    console.log('[login-by-phone] Новый веб-пользователь:', webId);

    return res.status(200).json({
      success: true,
      userId: webId,
      name: newUser.name || null,
      phone,
      tarif: null,
      isExistingUser: false,
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('[login-by-phone] Ошибка:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
