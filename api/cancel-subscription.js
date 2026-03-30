// api/cancel-subscription.js — Отмена автосписания подписки
// Работает через SQLite: очищает payment_method_id, ставит статус «неактивно»

const { getUser, deactivateSubscription, getDb } = require('./_lib/db');
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

    // Проверка: была ли активная подписка
    if (user.subscription_status !== 'активно' || !user.payment_method_id) {
      console.log('[cancel-subscription] Подписка уже неактивна:', {
        telegram_id,
        subscription_status: user.subscription_status,
        payment_method_id: user.payment_method_id,
      });
      return res.status(200).json({ 
        success: true, 
        already_inactive: true,
        message: 'Автосписание уже было отменено ранее'
      });
    }

    // Логируем отмену
    console.log('[cancel-subscription] Отмена автосписания:', {
      telegram_id,
      contact_id,
      name: user.name,
      tariff: user.tariff,
      subscription_end: user.subscription_end,
    });

    // Деактивируем в SQLite (status = неактивно, payment_method_id = null)
    deactivateSubscription(telegram_id);

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
