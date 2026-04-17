// POST /api/auth/verify-otp — Проверка OTP кода, выдача JWT

const { getUserByPhone, setUserEmail } = require('../_lib/db');
const { generateToken, generateRefreshToken } = require('../_lib/auth');
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

  const { phone: rawPhone, code } = req.body || {};
  if (!rawPhone || !code) return res.status(400).json({ error: 'Укажите телефон и код' });

  const phone = normalizePhone(rawPhone);

  const result = otpStore.verify(phone, code);
  if (!result.ok) {
    if (result.reason === 'expired') {
      return res.status(400).json({ error: 'Код истёк. Запросите новый.' });
    }
    if (result.reason === 'too_many') {
      return res.status(429).json({ error: 'Слишком много попыток. Запросите новый код.' });
    }
    const left = result.attemptsLeft ?? 0;
    return res.status(400).json({ error: `Неверный код.${left > 0 ? ` Осталось попыток: ${left}` : ''}` });
  }

  try {
    const user = await getUserByPhone(phone);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    if (result.email && !user.email) {
      try {
        await setUserEmail(user.telegram_id, result.email);
        user.email = result.email;
      } catch (e) {
        console.warn('[verify-otp] setUserEmail failed:', e.message);
      }
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    console.log('[verify-otp] Успешный вход:', user.telegram_id);

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
    console.error('[verify-otp] Ошибка:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
