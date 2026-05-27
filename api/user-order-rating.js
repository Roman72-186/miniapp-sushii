const { getOrderRatingRows } = require('./_lib/db');

function clampDays(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 15;
  return Math.min(60, Math.max(1, Math.round(n)));
}

function parseDDMMYYYY(value) {
  const parts = String(value || '').split('.');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(part => Number(part));
  if (!day || !month || !year) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function isActiveByDates(row) {
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = parseDDMMYYYY(row.subscription_start);
  const end = parseDDMMYYYY(row.subscription_end);
  if (!start && !end) return false;
  if (start && todayUtc < start) return false;
  if (end && todayUtc > end) return false;
  return true;
}

function isActiveUser(row) {
  const status = String(row.subscription_status || '').trim().toLowerCase();
  return Boolean(row.tariff) && status !== 'неактивно' && isActiveByDates(row);
}

function publicRatingRow(row, rank, activeUsers) {
  return {
    rank,
    activeUsers,
    telegram_id: String(row.telegram_id),
    name: row.name || null,
    avatar_url: row.avatar_url || null,
    ordersCount: Number(row.orders_count) || 0,
    totalSpent: Number(row.total_spent) || 0,
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const userId = req.query?.telegram_id || req.body?.telegram_id || req.query?.user_id || req.body?.user_id;
  if (!userId) return res.status(400).json({ error: 'telegram_id обязателен' });

  try {
    const days = clampDays(req.query?.days || req.body?.days);
    const rows = await getOrderRatingRows(days);
    const ranked = rows
      .filter(isActiveUser)
      .sort((a, b) => {
        const spentDiff = (Number(b.total_spent) || 0) - (Number(a.total_spent) || 0);
        if (spentDiff) return spentDiff;
        return (Number(b.orders_count) || 0) - (Number(a.orders_count) || 0);
      });

    const index = ranked.findIndex(row => String(row.telegram_id) === String(userId));
    const activeUsers = ranked.length;
    const rating = index >= 0
      ? publicRatingRow(ranked[index], index + 1, activeUsers)
      : {
          rank: null,
          activeUsers,
          telegram_id: String(userId),
          name: null,
          avatar_url: null,
          ordersCount: 0,
          totalSpent: 0,
        };

    return res.status(200).json({ success: true, days, rating });
  } catch (error) {
    console.error('user-order-rating error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
