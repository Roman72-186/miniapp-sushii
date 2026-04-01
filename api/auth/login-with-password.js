// POST /api/auth/login-with-password — Вход по телефону + паролю

const bcrypt = require('bcrypt');
const { getDb } = require('../_lib/db');
const { generateToken, generateRefreshToken } = require('../_lib/auth');
const { supabase } = require('../_lib/supabase');

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

  const { phone: rawPhone, password } = req.body || {};
  if (!rawPhone || !password) return res.status(400).json({ error: 'Укажите телефон и пароль' });

  const phone = normalizePhone(rawPhone);

  try {
    // Ищем хеш пароля в Supabase
    const { data: cred, error } = await supabase
      .from('web_credentials')
      .select('password_hash')
      .eq('phone', phone)
      .single();

    if (error || !cred) {
      return res.status(401).json({ error: 'Неверный телефон или пароль' });
    }

    const match = await bcrypt.compare(password, cred.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Неверный телефон или пароль' });
    }

    // Находим пользователя в SQLite
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    console.log('[login-with-password] Успешный вход:', user.telegram_id);

    return res.status(200).json({
      success: true,
      userId: user.telegram_id,
      name: user.name || null,
      phone,
      tarif: user.tariff || null,
      isExistingUser: true,
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('[login-with-password] Ошибка:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
