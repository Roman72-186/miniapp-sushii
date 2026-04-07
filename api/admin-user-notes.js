// api/admin-user-notes.js — Заметки к пользователю (admin)
const { checkAuth } = require('./_lib/admin-auth');
const { setUserNotes, getUser } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  const { telegram_id, notes } = req.body || {};
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });

  try {
    if (!(await getUser(telegram_id))) return res.status(404).json({ error: 'Пользователь не найден' });
    await setUserNotes(telegram_id, notes);
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('admin-user-notes error:', e.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
