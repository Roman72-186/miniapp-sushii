// api/check-subscription.js — Проверка подписки через WATBOT API
// Vercel Serverless Function (CommonJS)

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

  try {
    const response = await fetch(
      `https://watbot.ru/api/v1/getListItems?api_token=${apiToken}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schema_id: '69a16dc23dd8ee76a202a802',
          filters: { id_tg: String(telegram_id) },
        }),
      }
    );

    if (!response.ok) {
      console.error('WATBOT API error:', response.status, response.statusText);
      return res.status(502).json({ error: 'Ошибка запроса к WATBOT API' });
    }

    const data = await response.json();

    // data.data — массив записей пользователя
    const items = data.data || [];

    if (items.length === 0) {
      return res.status(200).json({ hasSubscription: false });
    }

    // Ищем тариф в записях
    const item = items[0];
    const tarif = item.tarif || item.Tarif || item.tariff || null;

    if (!tarif) {
      return res.status(200).json({ hasSubscription: false });
    }

    // Определяем тип подписки по тарифу
    const tarifStr = String(tarif);
    let type = null;
    if (tarifStr === '290') {
      type = 'discount'; // TODO: меню со скидками — заглушка
    } else if (tarifStr === '490') {
      type = 'rolls';
    } else if (tarifStr === '1190') {
      type = 'sets';
    }

    return res.status(200).json({
      hasSubscription: true,
      tarif: tarifStr,
      type,
    });
  } catch (error) {
    console.error('Ошибка проверки подписки:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
