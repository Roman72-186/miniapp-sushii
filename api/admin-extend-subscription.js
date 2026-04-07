// api/admin-extend-subscription.js — Продление подписки на N дней (admin)
const { checkAuth } = require('./_lib/admin-auth');
const { extendSubscription } = require('./_lib/db');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  const { telegram_id, days } = req.body || {};
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });
  const d = Number(days);
  if (!d || d < 1 || d > 365) return res.status(400).json({ error: 'days: от 1 до 365' });

  try {
    const user = await extendSubscription(telegram_id, d);

    // Инвалидируем кэш
    try {
      const p = path.join(__dirname, '..', 'data', 'users', `${telegram_id}.json`);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (_) {}

    console.log(`[admin-extend] ${telegram_id} +${d}д → ${user.subscription_end}`);
    return res.status(200).json({ success: true, subscription_end: user.subscription_end });
  } catch (e) {
    if (e.message === 'user_not_found') return res.status(404).json({ error: 'Пользователь не найден' });
    console.error('admin-extend-subscription error:', e.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
