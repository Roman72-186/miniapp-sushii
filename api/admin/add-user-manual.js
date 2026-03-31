// API для добавления пользователя через админ-панель
// POST /api/admin/add-user-manual

const { checkAuth } = require('../_lib/admin-auth');
const { getUser, upsertUser } = require('../_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  if (!checkAuth(req, res)) return;

  const {
    telegram_id,
    name,
    username,
    tariff,
    subscription_start,
    subscription_end,
  } = req.body || {};

  // Валидация обязательных полей
  if (!telegram_id) {
    return res.status(400).json({ error: 'Telegram ID обязателен' });
  }

  if (!tariff) {
    return res.status(400).json({ error: 'Тариф обязателен' });
  }

  if (!subscription_start || !subscription_end) {
    return res.status(400).json({ error: 'Даты начала и окончания обязательны' });
  }

  try {
    const existingUser = getUser(telegram_id);
    const finalName = name || username || `Пользователь ${telegram_id}`;

    if (existingUser) {
      console.log('[admin/add-user-manual] Обновление пользователя:', telegram_id);
      upsertUser({
        telegram_id,
        name: finalName,
        tariff,
        subscription_status: 'активно',
        subscription_start,
        subscription_end,
      });
    } else {
      console.log('[admin/add-user-manual] Создание пользователя:', telegram_id);
      upsertUser({
        telegram_id,
        name: finalName,
        tariff,
        subscription_status: 'активно',
        subscription_start,
        subscription_end,
      });
    }

    const user = getUser(telegram_id);

    return res.status(200).json({
      success: true,
      message: existingUser ? 'Пользователь обновлён' : 'Пользователь создан',
      user: {
        telegram_id: user.telegram_id,
        name: user.name,
        tariff: user.tariff,
        subscription_status: user.subscription_status,
        subscription_start: user.subscription_start,
        subscription_end: user.subscription_end,
      },
    });
  } catch (error) {
    console.error('[admin/add-user-manual] Ошибка:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
