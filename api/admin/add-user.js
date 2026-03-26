// API для добавления/обновления пользователя
// POST /api/admin/add-user
// {
//   "telegram_id": "123456789",
//   "name": "Имя",
//   "phone": "79991234567",
//   "tariff": "490",
//   "subscription_start": "20.03.2026",
//   "subscription_end": "20.04.2026"
// }

const { getUser, upsertUser } = require('../_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const {
    telegram_id,
    name,
    phone,
    tariff = '490',
    subscription_start,
    subscription_end,
    watbot_contact_id,
  } = req.body || {};

  if (!telegram_id) {
    return res.status(400).json({ error: 'telegram_id обязателен' });
  }

  if (!subscription_start || !subscription_end) {
    return res.status(400).json({ error: 'Даты subscription_start и subscription_end обязательны' });
  }

  try {
    const existingUser = getUser(telegram_id);

    if (existingUser) {
      console.log('[admin/add-user] Обновление пользователя:', telegram_id);
      upsertUser({
        telegram_id,
        name: name || existingUser.name,
        phone: phone || existingUser.phone,
        tariff,
        subscription_status: 'активно',
        subscription_start,
        subscription_end,
        watbot_contact_id: watbot_contact_id || existingUser.watbot_contact_id,
      });
    } else {
      console.log('[admin/add-user] Создание пользователя:', telegram_id);
      upsertUser({
        telegram_id,
        name,
        phone,
        tariff,
        subscription_status: 'активно',
        subscription_start,
        subscription_end,
        watbot_contact_id,
      });
    }

    const user = getUser(telegram_id);

    return res.status(200).json({
      success: true,
      message: existingUser ? 'Пользователь обновлён' : 'Пользователь создан',
      user: {
        telegram_id: user.telegram_id,
        name: user.name,
        phone: user.phone,
        tariff: user.tariff,
        subscription_status: user.subscription_status,
        subscription_start: user.subscription_start,
        subscription_end: user.subscription_end,
      },
    });
  } catch (error) {
    console.error('[admin/add-user] Ошибка:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
