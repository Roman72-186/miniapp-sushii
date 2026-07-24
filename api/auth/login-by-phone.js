// api/auth/login-by-phone.js — Шаг 1: проверка телефона

const { getUserByPhone, upsertUser, getUser } = require('../_lib/db');
const { generateToken, generateRefreshToken } = require('../_lib/auth');
const { supabase } = require('../_lib/supabase');
const { checkRateLimit, getClientIp } = require('../_lib/rate-limit');

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

  // Ответ этого эндпоинта — оракул: раскрывает, зарегистрирован ли номер и
  // установлен ли для него пароль. Без ограничения скорости это давало
  // перебрать существующие номера и понять, какие аккаунты уязвимы для
  // email-OTP флоу (см. п.5 в статусе исправлений выше). Полностью убрать
  // оракул нельзя, не поменяв сам флоу входа (клиенту нужно знать, что
  // показать дальше — пароль или email), поэтому ограничиваем скорость.
  const clientIp = getClientIp(req);
  if (!checkRateLimit(`login-by-phone:phone:${phone}`, { max: 10, windowMs: 10 * 60 * 1000 })) {
    return res.status(429).json({ error: 'Слишком много попыток для этого номера. Попробуйте позже.' });
  }
  if (!checkRateLimit(`login-by-phone:ip:${clientIp}`, { max: 30, windowMs: 10 * 60 * 1000 })) {
    return res.status(429).json({ error: 'Слишком много попыток. Попробуйте позже.' });
  }

  try {
    const existingUser = await getUserByPhone(phone);

    // === РЕГИСТРАЦИЯ нового пользователя (name передан, пользователь не найден) ===
    if (rawName && !existingUser) {
      const webId = 'web_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      const name = String(rawName).trim();
      try {
        await upsertUser({ telegram_id: webId, phone, name });
      } catch (err) {
        // Гонка: два параллельных запроса регистрации на один номер — один уже
        // создал пользователя (UNIQUE-индекс users.phone), берём его вместо
        // падения с 500. SQLite и Postgres формулируют ошибку по-разному —
        // проверяем оба варианта (better-sqlite3 бросает Error с текстом,
        // pg — код 23505 + имя констрейнта).
        const isPhoneUniqueViolation =
          String(err.message).includes('UNIQUE constraint failed: users.phone') ||
          (err.code === '23505' && String(err.constraint || err.message).includes('idx_users_phone_unique'));
        if (isPhoneUniqueViolation) {
          const racedUser = await getUserByPhone(phone);
          if (racedUser) {
            const token = generateToken(racedUser);
            const refreshToken = generateRefreshToken(racedUser);
            return res.status(200).json({ success: true, userId: racedUser.telegram_id, name: racedUser.name, phone, tarif: racedUser.tariff || null, isExistingUser: true, token, refreshToken });
          }
        }
        throw err;
      }
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
