// POST /api/auth/set-password — Установка/сброс пароля после OTP верификации

const bcrypt = require('bcrypt');
const { getUserByPhone } = require('../_lib/db');
const { generateToken, generateRefreshToken } = require('../_lib/auth');
const { supabase } = require('../_lib/supabase');
const otpStore = require('./_otp-store');

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

  const { phone: rawPhone, code, password } = req.body || {};
  if (!rawPhone || !code || !password) {
    return res.status(400).json({ error: 'Укажите телефон, код и новый пароль' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
  }

  const phone = normalizePhone(rawPhone);

  // Проверяем OTP код
  const result = otpStore.verify(phone, code);
  if (!result.ok) {
    if (result.reason === 'expired') return res.status(400).json({ error: 'Код истёк. Запросите новый.' });
    if (result.reason === 'too_many') return res.status(429).json({ error: 'Слишком много попыток. Запросите новый код.' });
    const left = result.attemptsLeft ?? 0;
    return res.status(400).json({ error: `Неверный код.${left > 0 ? ` Осталось попыток: ${left}` : ''}` });
  }

  try {
    // Хешируем пароль
    const password_hash = await bcrypt.hash(password, 12);

    // Сохраняем в Supabase (upsert)
    const { error: upsertError } = await supabase
      .from('web_credentials')
      .upsert({ phone, password_hash, updated_at: new Date().toISOString() }, { onConflict: 'phone' });

    if (upsertError) {
      console.error('[set-password] Supabase upsert error:', upsertError.message);
      return res.status(500).json({ error: 'Ошибка сохранения пароля' });
    }

    // Находим пользователя в SQLite
    const user = await getUserByPhone(phone);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    console.log('[set-password] Пароль установлен для:', user.telegram_id);

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
    console.error('[set-password] Ошибка:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
