// api/get-profile.js — Получение профиля подписчика через WATBOT API
// Vercel Serverless Function (CommonJS)
//
// WATBOT getContacts не поддерживает фильтр по telegram_id,
// поэтому запрашиваем все контакты (count=500, параллельно по страницам)
// и ищем нужный на клиенте. Переменные приходят inline в контакте.

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
      return res.status(404).json({ error: 'Контакт не найден' });
    }

    // 3. Извлекаем имя и телефон из контакта
    const contactName = contact.name || null;

    // 4. Извлекаем нужные переменные из contact.variables
    const variables = contact.variables || [];
    let статусСписания = null;
    let balance_shc = null;
    let датаОКОНЧАНИЯ = null;
    let phone = null;
    let телефон = null;

    for (const v of variables) {
      const name = v.name || '';
      const value = v.value != null ? String(v.value) : '';
      if (name === 'статусСписания') статусСписания = value;
      if (name === 'balance_shc') balance_shc = value;
      if (name === 'датаОКОНЧАНИЯ') датаОКОНЧАНИЯ = value;
      if (name === 'phone') phone = value;
      if (name === 'телефон') телефон = value;
    }

    return res.status(200).json({
      name: contactName,
      phone: phone || телефон || null,
      статусСписания,
      balance_shc,
      датаОКОНЧАНИЯ,
    });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
