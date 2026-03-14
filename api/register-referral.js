// api/register-referral.js — Регистрация реферальной связи (кто кого пригласил)
// Вызывается когда пользователь приходит по реферальной ссылке

const { upsertUser, setInvitedBy, getUser } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { telegram_id, invited_by } = req.body || {};
  if (!telegram_id || !invited_by) {
    return res.status(400).json({ error: 'telegram_id и invited_by обязательны' });
  }

  // Нельзя пригласить самого себя
  if (String(telegram_id) === String(invited_by)) {
    return res.status(400).json({ error: 'Нельзя пригласить самого себя' });
  }

  try {
    // Создаём запись пользователя если нет
    upsertUser({ telegram_id: String(telegram_id) });

    // Устанавливаем invited_by (только если ещё не установлен)
    setInvitedBy(String(telegram_id), String(invited_by));

    const user = getUser(telegram_id);
    return res.status(200).json({
      success: true,
      invited_by: user?.invited_by || null,
    });
  } catch (error) {
    console.error('register-referral error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
