// api/admin-add-shc.js — Ручное начисление SHC пользователю (admin)
const fs = require('fs');
const path = require('path');
const { checkAuth } = require('./_lib/admin-auth');
const { getUser, updateBalance } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { telegram_id, amount } = req.body || {};
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });

  const shcAmount = Number(amount);
  if (!Number.isInteger(shcAmount) || shcAmount < 1 || shcAmount > 1000000) {
    return res.status(400).json({ error: 'amount: целое число от 1 до 1000000' });
  }

  try {
    if (!(await getUser(telegram_id))) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // UPDATE с прибавлением атомарен и не перезаписывает параллельные начисления.
    await updateBalance(telegram_id, shcAmount);
    const updatedUser = await getUser(telegram_id);

    // Профиль пользователя кэшируется на диске до 5 минут.
    try {
      const cachePath = path.join(__dirname, '..', 'data', 'users', `${telegram_id}.json`);
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
    } catch (_) {}

    console.log(`[admin-add-shc] ${telegram_id} +${shcAmount} SHC`);
    return res.status(200).json({
      success: true,
      amount: shcAmount,
      balance_shc: Number(updatedUser?.balance_shc) || 0,
    });
  } catch (error) {
    console.error('admin-add-shc error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
