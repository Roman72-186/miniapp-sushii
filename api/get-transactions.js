// api/get-transactions.js — История начислений: комиссии (амбассадоры) + SHC бонусы (все)

const { getTransactions, getTotalEarnings, getUser, getReferralBonuses, getReferrals } = require('./_lib/db');

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
      return res.status(200).json({
        transactions: [], earnings: { total: 0, level1: 0, level2: 0 },
        bonuses: [], shc: { total: 0, friends_count: 0 },
        balance: 0,
      });
    }

    // Амбассадорские комиссии
    const transactions = getTransactions(telegram_id, 100);
    const earnings = getTotalEarnings(telegram_id);

    // SHC бонусы за рефералов
    const bonuses = getReferralBonuses(telegram_id, 100);
    const referrals = getReferrals(telegram_id);
    const totalShc = bonuses.reduce((sum, b) => sum + b.total_amount, 0);

    return res.status(200).json({
      // Амбассадорские комиссии (₽)
      transactions: transactions.map(t => ({
        referral_name: t.referral_name || 'Без имени',
        payment_amount: t.payment_amount,
        commission_amount: t.commission_amount,
        commission_percent: t.commission_percent,
        level: t.level,
        date: t.created_at,
      })),
      earnings,
      // SHC бонусы за друзей
      bonuses: bonuses.map(b => ({
        referral_name: b.referral_name || 'Без имени',
        base_amount: b.base_amount,
        threshold_bonus: b.threshold_bonus,
        total_amount: b.total_amount,
        friends_count: b.friends_count,
        achievement: b.achievement,
        date: b.created_at,
      })),
      shc: {
        total: totalShc,
        friends_count: referrals.length,
      },
      balance: user.balance_shc || 0,
    });
  } catch (error) {
    console.error('get-transactions error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
