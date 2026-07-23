// api/get-gift-history.js — История полученных подарков пользователя

const { getGiftHistory } = require('./_lib/db');
const { authMiddleware } = require('./_lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let authorized = false;
  authMiddleware(req, res, () => { authorized = true; });
  if (!authorized) return;

  const telegram_id = req.userId;

  try {
    const history = await getGiftHistory(telegram_id);
    return res.status(200).json({ success: true, history });
  } catch (error) {
    console.error('get-gift-history error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
