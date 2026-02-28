// api/get-profile.js — Получение профиля подписчика через WATBOT API
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
    // 1. Находим контакт по telegram_id
    const contactsRes = await fetch(
      `https://watbot.ru/api/v1/getContacts?api_token=${apiToken}&bot_id=72975&filters[telegram_id]=${encodeURIComponent(String(telegram_id))}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }
    );

    if (!contactsRes.ok) {
      console.error('WATBOT getContacts error:', contactsRes.status, contactsRes.statusText);
      return res.status(502).json({ error: 'Ошибка запроса к WATBOT API' });
    }

    const contactsData = await contactsRes.json();
    const contacts = contactsData.data || [];

    if (contacts.length === 0) {
      return res.status(404).json({ error: 'Контакт не найден' });
    }

    const contactId = contacts[0].id;

    // 2. Получаем переменные контакта
    const varsRes = await fetch(
      `https://watbot.ru/api/v1/getContactVariables?api_token=${apiToken}&contact_id=${contactId}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }
    );

    if (!varsRes.ok) {
      console.error('WATBOT getContactVariables error:', varsRes.status, varsRes.statusText);
      return res.status(502).json({ error: 'Ошибка получения переменных' });
    }

    const varsData = await varsRes.json();
    const variables = varsData.data || [];

    // Извлекаем нужные переменные
    let статусСписания = null;
    let balance_shc = null;
    let датаОКОНЧАНИЯ = null;

    for (const v of variables) {
      const name = v.name || v.variable_name || '';
      const value = v.value || v.variable_value || '';
      if (name === 'статусСписания') статусСписания = value;
      if (name === 'balance_shc') balance_shc = value;
      if (name === 'датаОКОНЧАНИЯ') датаОКОНЧАНИЯ = value;
    }

    return res.status(200).json({
      статусСписания,
      balance_shc,
      датаОКОНЧАНИЯ,
    });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
