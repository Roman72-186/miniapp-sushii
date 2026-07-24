// api/admin-login.js - Авторизация в админке
const { getAdminPassword, generateToken, safeCompare } = require('./_lib/admin-auth');
const { checkRateLimit, getClientIp } = require('./_lib/rate-limit');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  // Nginx уже лимитирует этот путь по IP (см. nginx/default.conf), но это
  // защита на уровне приложения на случай локального запуска без nginx перед
  // ним или изменения nginx-конфига — тот же инвариант single-instance, что у
  // rate-limit в login-by-phone.js.
  const clientIp = getClientIp(req);
  if (!checkRateLimit(`admin-login:ip:${clientIp}`, { max: 10, windowMs: 10 * 60 * 1000 })) {
    return res.status(429).json({ error: 'Слишком много попыток. Попробуйте позже.' });
  }

  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: 'Пароль обязателен' });
  }

  let adminPassword;
  try {
    adminPassword = getAdminPassword();
  } catch (error) {
    console.error('admin login config error:', error);
    return res.status(503).json({
      success: false,
      error: 'Админ-пароль не настроен на сервере',
    });
  }

  if (!safeCompare(password, adminPassword)) {
    return res.status(403).json({ error: 'Неверный пароль' });
  }

  const token = generateToken();
  return res.status(200).json({ success: true, token });
};
