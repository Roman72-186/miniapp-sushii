// api/admin-referrals.js — Данные реферальной системы для администратора

const { checkAuth } = require('./_lib/admin-auth');
const { getAdminTopReferrers, getAdminRecentBonuses } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  try {
    const [topReferrers, recentBonuses] = await Promise.all([
      getAdminTopReferrers(30),
      getAdminRecentBonuses(100),
    ]);
    return res.status(200).json({ success: true, topReferrers, recentBonuses });
  } catch (error) {
    console.error('admin-referrals error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
