// api/admin-subscribers.js — Список подписчиков из SQLite
const { checkAuth } = require('./_lib/admin-auth');
const { getDb } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  try {
    const db = getDb();

    // Все пользователи с подпиской (tariff не null)
    const subscribers = db.prepare(`
      SELECT telegram_id, name, phone, tariff, is_ambassador,
             subscription_status, subscription_start, subscription_end,
             balance_shc, created_at, updated_at
      FROM users
      WHERE tariff IS NOT NULL
      ORDER BY
        CASE tariff WHEN '9990' THEN 1 WHEN '1190' THEN 2 WHEN '490' THEN 3 WHEN '290' THEN 4 ELSE 5 END,
        updated_at DESC
    `).all();

    // Статистика
    const stats = {
      total: subscribers.length,
      by_tariff: {},
      ambassadors: 0,
      active: 0,
    };

    for (const s of subscribers) {
      stats.by_tariff[s.tariff] = (stats.by_tariff[s.tariff] || 0) + 1;
      if (s.is_ambassador) stats.ambassadors++;
      if (s.subscription_status === 'активно') stats.active++;
    }

    return res.status(200).json({ success: true, subscribers, stats });
  } catch (error) {
    console.error('admin-subscribers error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
