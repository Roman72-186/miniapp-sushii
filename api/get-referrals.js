// api/get-referrals.js — Получение рефералов (SQLite основной, WATBOT fallback)

const { getUser, getReferrals: getDbReferrals } = require('./_lib/db');
const { readUserCache } = require('./_lib/user-cache');

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
      // Ищем по watbot_contact_id в SQLite
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

    // Fallback на WATBOT если SQLite не работает
    if (contact_id) {
      try {
        const apiToken = process.env.WATBOT_API_TOKEN;
        if (apiToken) {
          const refRes = await fetch(
            `https://watbot.ru/api/v1/getReferrals?api_token=${apiToken}&bot_id=72975&contact_id=${contact_id}`,
            { headers: { 'Accept': 'application/json' } }
          );
          if (refRes.ok) {
            const refData = await refRes.json();
            const refList = Array.isArray(refData.data) ? refData.data : (Array.isArray(refData) ? refData : []);
            const referrals = await Promise.all(
              refList.map(async (r) => {
                const entry = { name: r.name || 'Без имени', telegram_id: r.telegram_id || null, is_ambassador: false };
                if (entry.telegram_id) {
                  try {
                    const cached = await readUserCache(entry.telegram_id);
                    if (cached && Array.isArray(cached.tags) && cached.tags.includes('Амба')) entry.is_ambassador = true;
                  } catch (_) {}
                }
                return entry;
              })
            );
            return res.status(200).json({
              referrals_count: referrals.length,
              ambassadors_count: referrals.filter(r => r.is_ambassador).length,
              referrals,
            });
          }
        }
      } catch (_) {}
    }

    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
