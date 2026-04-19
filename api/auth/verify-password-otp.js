const otpStore = require('./_otp-store');
const { createOtpProof } = require('./_otp-proof');

function normalizePhone(raw) {
  const nums = String(raw || '').replace(/\D/g, '');
  if (nums.length === 11 && nums.startsWith('8')) return '7' + nums.slice(1);
  if (nums.length === 11 && nums.startsWith('7')) return nums;
  if (nums.length === 10) return '7' + nums;
  return nums;
}

function otpError(res, result) {
  if (result.reason === 'expired') {
    return res.status(400).json({ error: 'Код истек. Запросите новый.' });
  }
  if (result.reason === 'too_many') {
    return res.status(429).json({ error: 'Слишком много попыток. Запросите новый код.' });
  }
  const left = result.attemptsLeft ?? 0;
  return res.status(400).json({ error: `Неверный код.${left > 0 ? ` Осталось попыток: ${left}` : ''}` });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://sushi-house-39.ru');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { phone: rawPhone, code } = req.body || {};
  if (!rawPhone || !code) {
    return res.status(400).json({ error: 'Укажите телефон и код' });
  }

  const phone = normalizePhone(rawPhone);
  const result = otpStore.verify(phone, code);
  if (!result.ok) return otpError(res, result);

  return res.status(200).json({
    success: true,
    otpToken: createOtpProof({ phone, email: result.email }),
  });
};
