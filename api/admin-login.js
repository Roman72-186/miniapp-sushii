// api/admin-login.js - Авторизация в админке
const { getAdminPassword, generateToken } = require('./_lib/admin-auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
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

  if (password !== adminPassword) {
    return res.status(403).json({ error: 'Неверный пароль' });
  }

  const token = generateToken();
  return res.status(200).json({ success: true, token });
};
