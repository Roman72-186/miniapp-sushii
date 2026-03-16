// api/get-referrals.js — Получение рефералов из SQLite

const { getUser, getReferrals: getDbReferrals } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { contact_id, telegram_id } = req.body || {};

  try {
    // Определяем telegram_id (можно передать напрямую или через contact_id)
    let tgId = telegram_id;

    if (!tgId && contact_id) {
      const { getUserByContactId } = require('./_lib/db');
      const user = getUserByContactId(contact_id);
      if (user) tgId = user.telegram_id;
    }

    if (!tgId) {
      return res.status(400).json({ error: 'telegram_id или contact_id обязателен' });
    }

    // Получаем рефералов из SQLite
    const referrals = getDbReferrals(tgId);

    const result = referrals.map(r => ({
      name: r.name || 'Без имени',
      telegram_id: r.telegram_id,
      is_ambassador: !!r.is_ambassador,
      tariff: r.tariff,
    }));

    const ambassadors_count = result.filter(r => r.is_ambassador).length;

    return res.status(200).json({
      referrals_count: result.length,
      ambassadors_count,
      referrals: result,
    });
  } catch (error) {
    console.error('get-referrals error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
