// api/admin-login.js — Авторизация в админке
const { getAdminPassword, generateToken } = require('./_lib/admin-auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Пароль обязателен' });

  if (password !== getAdminPassword()) {
    return res.status(403).json({ error: 'Неверный пароль' });
  }

  const token = generateToken();
  return res.status(200).json({ success: true, token });
};
