// api/admin-stats.js — Статистика для дашборда (admin)
const { checkAuth } = require('./_lib/admin-auth');
const {
  getAllUsersForStats,
  getMonthRevenue,
  getOrdersStats,
  getPaymentsStats,
  getOrdersDaily,
} = require('./_lib/db');

function parseDate(ddmmyyyy) {
  if (!ddmmyyyy) return null;
  const [dd, mm, yyyy] = ddmmyyyy.split('.');
  return new Date(`${yyyy}-${mm}-${dd}`);
}

function toIso(date) {
  // YYYY-MM-DD HH:MM:SS — подходит и SQLite (datetime(...)), и PG (сравнение с timestamp)
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function buildPeriod(days) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = toIso(since);
  const [orders, payments] = await Promise.all([
    getOrdersStats(sinceIso),
    getPaymentsStats(sinceIso),
  ]);
  return {
    orders: orders.orders,
    ordersRevenue: orders.revenue,
    promoGifts: orders.promoGifts,
    thresholdGifts: orders.thresholdGifts,
    newSubs: payments.count,
    subsRevenue: payments.revenue,
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  try {
    const allUsers = await getAllUsersForStats();

    const now = new Date(); now.setHours(0,0,0,0);
    const in7 = new Date(now); in7.setDate(in7.getDate() + 7);
    const ago7 = new Date(now); ago7.setDate(ago7.getDate() - 7);

    const activeByTariff = { '290': 0, '490': 0, '1190': 0 };
    let activeTotal = 0, ambassadors = 0, expiringSoon = 0;

    for (const u of allUsers) {
      if (u.is_ambassador) ambassadors++;
      if (u.subscription_status !== 'активно') continue;
      activeTotal++;
      if (activeByTariff[u.tariff] !== undefined) activeByTariff[u.tariff]++;

      const end = parseDate(u.subscription_end);
      if (end && end >= now && end <= in7) expiringSoon++;
    }

    const newThisWeek = allUsers.filter(u => {
      if (!u.created_at) return false;
      return new Date(u.created_at) >= ago7;
    }).length;

    // Выручка за текущий месяц
    const now2 = new Date();
    const monthStart = `${now2.getFullYear()}-${String(now2.getMonth()+1).padStart(2,'0')}-01`;
    const revenue = await getMonthRevenue(monthStart);

    // Периодные агрегаты + дневной график
    const [p1, p7, p15, p30, ordersDaily] = await Promise.all([
      buildPeriod(1),
      buildPeriod(7),
      buildPeriod(15),
      buildPeriod(30),
      getOrdersDaily(30),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers: allUsers.length,
        activeTotal,
        activeByTariff,
        ambassadors,
        expiringSoon,
        newThisWeek,
        revenueThisMonth: revenue.total,
        periods: { '1d': p1, '7d': p7, '15d': p15, '30d': p30 },
        ordersDaily,
      },
    });
  } catch (e) {
    console.error('admin-stats error:', e.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
