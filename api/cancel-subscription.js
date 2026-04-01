// api/cancel-subscription.js — Отмена автосписания подписки
// Работает через SQLite: очищает payment_method_id, ставит статус «неактивно»

const { getUser, cancelAutoRenew } = require('./_lib/db');
const { writeUserCache } = require('./_lib/user-cache');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { telegram_id, contact_id } = req.body || {};

  if (!telegram_id) {
    return res.status(400).json({ error: 'telegram_id обязателен' });
  }

  try {
    const user = getUser(telegram_id);
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверка: есть ли что отменять
    if (!user.payment_method_id) {
      return res.status(200).json({
        success: true,
        already_inactive: true,
        message: 'Автопродление уже было отменено ранее'
      });
    }

    // Логируем отмену
    console.log('[cancel-subscription] Отмена автопродления:', {
      telegram_id,
      name: user.name,
      tariff: user.tariff,
      subscription_end: user.subscription_end,
    });

    // Только убираем payment_method_id — подписка остаётся активной до конца срока
    cancelAutoRenew(telegram_id);

    // Очищаем кэш пользователя (чтобы изменения применились сразу)
    try {
      const fs = require('fs');
      const path = require('path');
      const cachePath = path.join(__dirname, '..', 'data', 'user-cache', `${telegram_id}.json`);
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
        console.log('[cancel-subscription] Кэш очищен:', cachePath);
      }
    } catch (e) {
      console.error('[cancel-subscription] Ошибка очистки кэша:', e.message);
    }

    // TODO: Здесь можно добавить отправку уведомления в WatBot
    // Например: await sendBotMessage(telegram_id, 'Ваша подписка отменена...');

    console.log('[cancel-subscription] Успешно отменено:', telegram_id);

    return res.status(200).json({ 
      success: true,
      message: 'Автосписание отменено'
    });
  } catch (error) {
    console.error('[cancel-subscription] Ошибка отмены подписки:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
