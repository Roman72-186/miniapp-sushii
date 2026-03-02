// api/check-tag.js — Проверка тега "подписка30" через WATBOT API
// Vercel Serverless Function (CommonJS)
//
// Ищет контакт по telegram_id (пагинация count=500, параллельно),
// затем проверяет наличие тега "подписка30" через getContactTags.

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

  const apiToken = process.env.WATBOT_API_TOKEN;
  if (!apiToken) {
    console.error('WATBOT_API_TOKEN не настроен');
    return res.status(500).json({ error: 'Ошибка конфигурации сервера' });
  }

  const tgId = String(telegram_id);
  const base = `https://watbot.ru/api/v1/getContacts?api_token=${apiToken}&bot_id=72975&count=500`;

  try {
    // 1. Первая страница — узнаём общее кол-во страниц
    const firstRes = await fetch(`${base}&page=1`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!firstRes.ok) {
      console.error('WATBOT getContacts error:', firstRes.status);
      return res.status(502).json({ error: 'Ошибка запроса к WATBOT API' });
    }

    const firstData = await firstRes.json();
    const lastPage = firstData.meta?.last_page || 1;

    // Ищем в первой странице
    let contact = (firstData.data || []).find(c => c.telegram_id === tgId);

    // 2. Если не найден — запрашиваем оставшиеся страницы параллельно
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

    // 3. Проверяем теги контакта
    const tagsRes = await fetch(
      `https://watbot.ru/api/v1/getContactTags?contact_id=${contact.id}&api_token=${apiToken}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!tagsRes.ok) {
      console.error('WATBOT getContactTags error:', tagsRes.status);
      return res.status(502).json({ error: 'Ошибка запроса тегов' });
    }

    const tagsData = await tagsRes.json();
    const tags = tagsData.data || tagsData || [];

    // Ищем тег "подписка30"
    // API возвращает массив строк: ["ознакомлен", "подписка30", ...]
    const hasTag = Array.isArray(tags)
      ? tags.some(t => typeof t === 'string' ? t === 'подписка30' : (t.name || t.tag || '') === 'подписка30')
      : false;

    return res.status(200).json({ hasTag });
  } catch (error) {
    console.error('Ошибка проверки тега:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
