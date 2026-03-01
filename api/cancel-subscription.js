// api/cancel-subscription.js — Отмена автосписания подписки
// 1. Удаляет переменную PaymentID
// 2. Устанавливает статусСписания = "неактивно"
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

  const base = 'https://watbot.ru/api/v1';

  try {
    // 1. Удаляем PaymentID
    await fetch(`${base}/deleteContactVariable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        api_token: apiToken,
        bot_id: 72975,
        contact_id: Number(contact_id),
        name: 'PaymentID',
      }),
    });

    // 2. Устанавливаем статусСписания = "неактивно"
    await fetch(`${base}/setContactVariable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        api_token: apiToken,
        bot_id: 72975,
        contact_id: Number(contact_id),
        name: 'статусСписания',
        value: 'неактивно',
      }),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Ошибка отмены подписки:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
