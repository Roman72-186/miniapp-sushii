// api/get-contact.js — Получение контактных данных из WATBOT CRM по Telegram ID (с кэшем)
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
    if (cache && cache.listItem) {
      return res.status(200).json({
        name: cache.listItem.name || null,
        phone: cache.listItem.telefon || null,
      });
    }

    // 2. Fallback: WATBOT API
    const apiToken = process.env.WATBOT_API_TOKEN;
    if (!apiToken) {
      return res.status(500).json({ error: 'Ошибка конфигурации сервера' });
    }

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
      return res.status(502).json({ error: 'Ошибка запроса к WATBOT API' });
    }

    const data = await response.json();
    const items = data.data || [];

    if (items.length === 0) {
      return res.status(200).json({ name: null, phone: null });
    }

    const item = items[0];
    const name = item.name || item.Name || null;
    const phone = item.telefon || item.phone || item.Telefon || null;

    return res.status(200).json({ name, phone });
  } catch (error) {
    console.error('Ошибка получения контакта:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
