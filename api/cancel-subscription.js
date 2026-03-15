// api/cancel-subscription.js — Отмена автосписания подписки
// Работает через SQLite: очищает payment_method_id, ставит статус «неактивно»

const { getUser, deactivateSubscription } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { telegram_id, contact_id } = req.body || {};

  if (!telegram_id) {
    return res.status(400).json({ error: 'telegram_id обязателен' });
  }

  try {
    const user = getUser(telegram_id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Деактивируем в SQLite (status = неактивно, payment_method_id = null)
    deactivateSubscription(telegram_id);

    // Опционально: синхронизация с WATBOT (fire-and-forget, пока не убрали полностью)
    const apiToken = process.env.WATBOT_API_TOKEN;
    if (apiToken && contact_id) {
      const base = 'https://watbot.ru/api/v1';
      Promise.all([
        fetch(`${base}/deleteContactVariable`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ api_token: apiToken, bot_id: 72975, contact_id: Number(contact_id), name: 'PaymentID' }),
        }),
        fetch(`${base}/setContactVariable`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ api_token: apiToken, bot_id: 72975, contact_id: Number(contact_id), name: 'статусСписания', value: 'неактивно' }),
        }),
      ]).catch(err => console.warn('cancel-subscription: WATBOT sync failed (non-fatal):', err.message));
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Ошибка отмены подписки:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
