// api/auth/login-by-phone.js — Шаг 1: проверка телефона, отправка OTP

const { getDb, upsertUser, getUser } = require('../_lib/db');
const { generateToken, generateRefreshToken } = require('../_lib/auth');
const otpStore = require('./_otp-store');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function normalizePhone(raw) {
  const nums = String(raw || '').replace(/\D/g, '');
  if (nums.length === 11 && nums.startsWith('8')) return '7' + nums.slice(1);
  if (nums.length === 11 && nums.startsWith('7')) return nums;
  if (nums.length === 10) return '7' + nums;
  return nums;
}

async function sendOtpViaTelegram(telegramId, code) {
  if (!BOT_TOKEN) return false;
  try {
    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: `🔐 Ваш код для входа на сайт Суши-Хаус 39:\n\n*${code}*\n\nКод действителен 5 минут. Никому не сообщайте его.`,
        parse_mode: 'Markdown',
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
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
    const db = getDb();
    const existingUser = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);

    // === РЕГИСТРАЦИЯ нового пользователя (name передан, пользователь не найден) ===
    if (rawName && !existingUser) {
      const webId = 'web_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      const name = String(rawName).trim();
      upsertUser({ telegram_id: webId, phone, name });
      const newUser = getUser(webId);
      const token = generateToken(newUser);
      const refreshToken = generateRefreshToken(newUser);
      console.log('[login-by-phone] Новый веб-пользователь:', webId);
      return res.status(200).json({ success: true, userId: webId, name: newUser.name, phone, tarif: null, isExistingUser: false, token, refreshToken });
    }

    // === СУЩЕСТВУЮЩИЙ пользователь ===
    if (existingUser) {
      const hasTelegram = /^\d+$/.test(existingUser.telegram_id);

      if (hasTelegram) {
        // Пользователь с Telegram — отправляем OTP
        if (!otpStore.canResend(phone)) {
          const wait = otpStore.timeUntilResend(phone);
          return res.status(429).json({ error: `Подождите ${wait} сек. перед повторной отправкой кода` });
        }
        const code = otpStore.set(phone);
        const sent = await sendOtpViaTelegram(existingUser.telegram_id, code);
        if (!sent) {
          return res.status(500).json({ error: 'Не удалось отправить код. Убедитесь, что вы писали нашему боту в Telegram.' });
        }
        console.log('[login-by-phone] OTP отправлен пользователю:', existingUser.telegram_id);
        return res.status(200).json({ success: true, requiresOtp: true, phone });
      }

      // Веб-пользователь без Telegram (создан через админку) — выдаём JWT без OTP
      const token = generateToken(existingUser);
      const refreshToken = generateRefreshToken(existingUser);
      console.log('[login-by-phone] Веб-пользователь (без Telegram):', existingUser.telegram_id);
      return res.status(200).json({ success: true, userId: existingUser.telegram_id, name: existingUser.name || null, phone, tarif: existingUser.tariff || null, isExistingUser: true, token, refreshToken });
    }

    // === НОВЫЙ пользователь — предлагаем ввести имя ===
    return res.status(200).json({ success: true, isExistingUser: false, phone });

  } catch (error) {
    console.error('[login-by-phone] Ошибка:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
