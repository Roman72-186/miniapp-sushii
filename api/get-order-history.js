// api/get-order-history.js — История всех заказов пользователя

const { getOrderHistory } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const telegram_id = req.query?.telegram_id || req.body?.telegram_id;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });

  try {
    const orders = await getOrderHistory(telegram_id, 50);
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('get-order-history error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
