// api/admin-reset-subscription.js — Сброс подписки пользователя (admin)
const { checkAuth } = require('./_lib/admin-auth');
const { getUser, deactivateSubscription } = require('./_lib/db');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  const { telegram_id } = req.body || {};
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });

  try {
    const user = getUser(telegram_id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    deactivateSubscription(telegram_id);

    // Инвалидируем файловый кэш
    try {
      const cachePath = path.join(__dirname, '..', 'data', 'users', `${telegram_id}.json`);
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
    } catch (_) {}

    console.log('[admin-reset-subscription] Сброс подписки:', telegram_id, user.name);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('admin-reset-subscription error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
