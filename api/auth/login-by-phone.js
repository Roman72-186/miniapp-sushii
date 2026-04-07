// api/auth/login-by-phone.js — Шаг 1: проверка телефона

const { getUserByPhone, upsertUser, getUser } = require('../_lib/db');
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

  const { phone: rawPhone, name: rawName } = req.body || {};
  if (!rawPhone) return res.status(400).json({ error: 'Укажите номер телефона' });

  const phone = normalizePhone(rawPhone);
  if (!/^7\d{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Некорректный номер телефона. Формат: +7XXXXXXXXXX' });
  }

  try {
    const existingUser = await getUserByPhone(phone);

    // === РЕГИСТРАЦИЯ нового пользователя (name передан, пользователь не найден) ===
    if (rawName && !existingUser) {
      const webId = 'web_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      const name = String(rawName).trim();
      await upsertUser({ telegram_id: webId, phone, name });
      const newUser = await getUser(webId);
      const token = generateToken(newUser);
      const refreshToken = generateRefreshToken(newUser);
      console.log('[login-by-phone] Новый веб-пользователь:', webId);
      return res.status(200).json({ success: true, userId: webId, name: newUser.name, phone, tarif: null, isExistingUser: false, token, refreshToken });
    }

    // === СУЩЕСТВУЮЩИЙ пользователь ===
    if (existingUser) {
      // Проверяем наличие пароля в Supabase
      const { data: cred } = await supabase
        .from('web_credentials')
        .select('phone')
        .eq('phone', phone)
        .maybeSingle();

      if (cred) {
        // Пароль установлен — переходим к вводу пароля
        return res.status(200).json({ success: true, hasPassword: true, phone });
      }

      // Пароля нет — нужен email для OTP
      return res.status(200).json({ success: true, hasPassword: false, requiresEmail: true, phone });
    }

    // === НОВЫЙ пользователь — предлагаем ввести имя ===
    return res.status(200).json({ success: true, isExistingUser: false, phone });

  } catch (error) {
    console.error('[login-by-phone] Ошибка:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
