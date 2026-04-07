// POST /api/admin/set-subscription — Смена тарифа + дата окончания подписки
const { checkAuth } = require('./_lib/admin-auth');
const { upsertUser, getUser } = require('./_lib/db');
const path = require('path');
const fs = require('fs');

function formatDate(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}.${m}.${date.getFullYear()}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });
  if (!checkAuth(req, res)) return;

  const { telegram_id, tariff, end_date } = req.body || {};
  if (!telegram_id || !tariff || !end_date) {
    return res.status(400).json({ error: 'telegram_id, tariff и end_date обязательны' });
  }

  const VALID_TARIFFS = ['290', '490', '1190', '9990'];
  if (!VALID_TARIFFS.includes(String(tariff))) {
    return res.status(400).json({ error: 'Некорректный тариф' });
  }

  try {
    const endDateObj = new Date(end_date + 'T00:00:00');
    if (isNaN(endDateObj.getTime())) {
      return res.status(400).json({ error: 'Некорректная дата' });
    }

    const subscription_end = formatDate(endDateObj);
    const subscription_start = formatDate(new Date());

    await upsertUser({
      telegram_id: String(telegram_id),
      tariff: String(tariff),
      subscription_status: 'активно',
      subscription_start,
      subscription_end,
    });

    // Сбрасываем кэш
    try {
      const cachePath = path.join(__dirname, '..', 'data', 'users', `${telegram_id}.json`);
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
    } catch {}

    const user = await getUser(String(telegram_id));
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('[admin-set-subscription] Ошибка:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
