// api/get-referrals.js — Получение рефералов по WATBOT contact_id
// Vercel Serverless Function (CommonJS)

const { readUserCache } = require('./_lib/user-cache');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { contact_id } = req.body || {};
  if (!contact_id) return res.status(400).json({ error: 'contact_id обязателен' });

  const apiToken = process.env.WATBOT_API_TOKEN;
  if (!apiToken) return res.status(500).json({ error: 'Ошибка конфигурации сервера' });

  try {
    const refRes = await fetch(
      `https://watbot.ru/api/v1/getReferrals?api_token=${apiToken}&bot_id=72975&contact_id=${contact_id}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!refRes.ok) {
      return res.status(502).json({ error: 'Ошибка запроса к WATBOT API' });
    }

    const refData = await refRes.json();
    const refList = Array.isArray(refData.data) ? refData.data : (Array.isArray(refData) ? refData : []);

    // Проверяем статус амбассадора каждого реферала через Blob кэш
    const referrals = await Promise.all(
      refList.map(async (r) => {
        const entry = {
          name: r.name || 'Без имени',
          telegram_id: r.telegram_id || null,
          is_ambassador: false,
        };

        if (entry.telegram_id) {
          try {
            const cached = await readUserCache(entry.telegram_id);
            if (cached && Array.isArray(cached.tags) && cached.tags.includes('Амба')) {
              entry.is_ambassador = true;
            }
          } catch (_) {}
        }

        return entry;
      })
    );

    const ambassadors_count = referrals.filter(r => r.is_ambassador).length;

    return res.status(200).json({
      referrals_count: referrals.length,
      ambassadors_count,
      referrals,
    });
  } catch (error) {
    console.error('Ошибка получения рефералов:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
