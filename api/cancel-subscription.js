// api/cancel-subscription.js — Отмена автосписания подписки
// Работает через SQLite: очищает payment_method_id, ставит статус «неактивно»

const { getUser, deactivateSubscription } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { telegram_id } = req.body || {};

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

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Ошибка отмены подписки:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
