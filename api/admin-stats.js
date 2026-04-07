// api/admin-stats.js — Статистика для дашборда (admin)
const { checkAuth } = require('./_lib/admin-auth');
const { getAllUsersForStats, getMonthRevenue } = require('./_lib/db');

function parseDate(ddmmyyyy) {
  if (!ddmmyyyy) return null;
  const [dd, mm, yyyy] = ddmmyyyy.split('.');
  return new Date(`${yyyy}-${mm}-${dd}`);
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
      },
    });
  } catch (e) {
    console.error('admin-stats error:', e.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
