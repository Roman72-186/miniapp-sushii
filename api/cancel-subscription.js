// api/cancel-subscription.js — Отмена автосписания подписки
// Очищает payment_method_id и запоминает, что пользователь отключил автосписание.

const { getUser, cancelAutoRenew } = require('./_lib/db');
const { authMiddleware } = require('./_lib/auth');

function clearAutoRenewCache(telegramId) {
  try {
    const fs = require('fs');
    const path = require('path');
    const cachePath = path.join(__dirname, '..', 'data', 'users', `${telegramId}.json`);
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
      console.log('[cancel-subscription] Кэш автопродления очищен:', cachePath);
    }
  } catch (e) {
    console.error('[cancel-subscription] Ошибка очистки кэша:', e.message);
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  let authorized = false;
  authMiddleware(req, res, () => { authorized = true; });
  if (!authorized) return;

  const telegram_id = req.userId;

  try {
    const user = await getUser(telegram_id);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const autoRenewDisabled = user.auto_renew_disabled === true || user.auto_renew_disabled === 1 || user.auto_renew_disabled === '1';

    // Если метода оплаты уже нет, всё равно фиксируем намерение пользователя на будущее.
    if (!user.payment_method_id && autoRenewDisabled) {
      // Старый кэш мог всё ещё содержать PaymentID. Удаляем его и при повторной отмене.
      clearAutoRenewCache(telegram_id);
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

    // Убираем payment_method_id и ставим флаг отмены — подписка остаётся активной до конца срока
    await cancelAutoRenew(telegram_id);

    // Удаляем и файловый кэш, в котором legacy-версии хранили PaymentID.
    clearAutoRenewCache(telegram_id);

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
