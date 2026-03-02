// api/check-tag.js — Проверка тега "подписка30" через WATBOT API (с кэшем)
// Vercel Serverless Function (CommonJS)

const { readUserCache } = require('./_lib/user-cache');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const { telegram_id } = req.body || {};

  if (!telegram_id) {
    return res.status(400).json({ error: 'telegram_id обязателен' });
  }

  try {
    // 1. Попытка из кэша
    const cache = await readUserCache(telegram_id);
    if (cache && cache.tags) {
      const hasTag = cache.tags.includes('подписка30');
      return res.status(200).json({ hasTag });
    }

    // 2. Fallback: WATBOT API
    const apiToken = process.env.WATBOT_API_TOKEN;
    if (!apiToken) {
      return res.status(500).json({ error: 'Ошибка конфигурации сервера' });
    }

    const tgId = String(telegram_id);
    const base = `https://watbot.ru/api/v1/getContacts?api_token=${apiToken}&bot_id=72975&count=500`;

    const firstRes = await fetch(`${base}&page=1`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!firstRes.ok) {
      return res.status(502).json({ error: 'Ошибка запроса к WATBOT API' });
    }

    const firstData = await firstRes.json();
    const lastPage = firstData.meta?.last_page || 1;

    let contact = (firstData.data || []).find(c => c.telegram_id === tgId);

    if (!contact && lastPage > 1) {
      const pageNums = [];
      for (let p = 2; p <= lastPage; p++) pageNums.push(p);

      const results = await Promise.all(
        pageNums.map(p =>
          fetch(`${base}&page=${p}`, { headers: { 'Accept': 'application/json' } })
            .then(r => r.json())
            .then(data => (data.data || []).find(c => c.telegram_id === tgId) || null)
            .catch(() => null)
        )
      );

      contact = results.find(c => c !== null) || null;
    }

    if (!contact) {
      return res.status(200).json({ hasTag: false });
    }

    const tagsRes = await fetch(
      `https://watbot.ru/api/v1/getContactTags?contact_id=${contact.id}&api_token=${apiToken}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!tagsRes.ok) {
      return res.status(502).json({ error: 'Ошибка запроса тегов' });
    }

    const tagsData = await tagsRes.json();
    const tags = tagsData.data || tagsData || [];

    const hasTag = Array.isArray(tags)
      ? tags.some(t => typeof t === 'string' ? t === 'подписка30' : (t.name || t.tag || '') === 'подписка30')
      : false;

    return res.status(200).json({ hasTag });
  } catch (error) {
    console.error('Ошибка проверки тега:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
