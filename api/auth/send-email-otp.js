// POST /api/auth/send-email-otp — Отправка OTP кода на email

const otpStore = require('./_otp-store');
const { sendOtpViaEmail } = require('./_email-sender');

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

  const { phone: rawPhone, email } = req.body || {};
  if (!rawPhone || !email) {
    return res.status(400).json({ error: 'Укажите телефон и email' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Некорректный email' });
  }

  const phone = normalizePhone(rawPhone);

  if (!otpStore.canResend(phone)) {
    const wait = otpStore.timeUntilResend(phone);
    return res.status(429).json({ error: `Подождите ${wait} сек. перед повторной отправкой` });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const code = otpStore.set(phone, normalizedEmail);
  const sent = await sendOtpViaEmail(normalizedEmail, code);
  if (!sent) {
    return res.status(500).json({ error: 'Не удалось отправить письмо. Попробуйте позже.' });
  }

  console.log('[send-email-otp] Код отправлен на', email, 'для', phone);
  return res.status(200).json({ success: true });
};
