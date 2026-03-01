// api/get-referrals.js — Получение рефералов по WATBOT contact_id
// Vercel Serverless Function (CommonJS)

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

    const referrals = refList.map(r => ({
      name: r.name || 'Без имени',
      telegram_id: r.telegram_id || null,
    }));

    return res.status(200).json({
      referrals_count: referrals.length,
      referrals_top10: referrals.slice(0, 10),
    });
  } catch (error) {
    console.error('Ошибка получения рефералов:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
