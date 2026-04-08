// api/admin-gift-orders.js — Список всех заказов подписчиков (для администратора)

const { checkAuth } = require('./_lib/admin-auth');
const { getAdminOrders } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  try {
    const orders = await getAdminOrders(500);
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('admin-gift-orders error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
