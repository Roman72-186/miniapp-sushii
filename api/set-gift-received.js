// api/set-gift-received.js — Записывает дату получения подарка в контакт WATBOT
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

  // Формат DD.MM.YYYY
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const today = `${dd}.${mm}.${yyyy}`;

  try {
    await fetch('https://watbot.ru/api/v1/setContactVariable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        api_token: apiToken,
        bot_id: 72975,
        contact_id: Number(contact_id),
        name: 'датаПодарка',
        value: today,
      }),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Ошибка записи даты подарка:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
