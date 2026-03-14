// api/get-transactions.js — История начислений амбассадора (SQLite)

const { getTransactions, getTotalEarnings, getUser } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { telegram_id } = req.body || {};
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });

  try {
    const user = getUser(telegram_id);
    if (!user) {
      return res.status(200).json({ transactions: [], earnings: { total: 0, level1: 0, level2: 0 }, balance: 0 });
    }

    const transactions = getTransactions(telegram_id, 100);
    const earnings = getTotalEarnings(telegram_id);

    return res.status(200).json({
      transactions: transactions.map(t => ({
        referral_name: t.referral_name || 'Без имени',
        payment_amount: t.payment_amount,
        commission_amount: t.commission_amount,
        commission_percent: t.commission_percent,
        level: t.level,
        date: t.created_at,
      })),
      earnings,
      balance: user.balance_shc || 0,
    });
  } catch (error) {
    console.error('get-transactions error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
