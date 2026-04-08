// api/admin-gift-orders.js — Список всех полученных подарков (для администратора)

const { checkAuth } = require('./_lib/admin-auth');
const { getGiftOrders } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  try {
    const orders = await getGiftOrders(300);
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('admin-gift-orders error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
