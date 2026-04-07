// api/cron-subscriptions.js — Ежедневная проверка подписок
// 1. Напоминание за 3 дня до окончания
// 2. Напоминание за 1 день до окончания
// 3. В день окончания: попытка рекуррентного списания
// 4. Если списание не прошло — деактивация подписки

const crypto = require('crypto');
const {
  getExpiringSubscriptions,
  getExpiredToday,
  deactivateSubscription,
  renewSubscription,
  recordPayment,
  processReferralSHC,
} = require('./_lib/db');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

// Цены рекуррентного списания (1 месяц)
const RECURRING_PRICES = {
  '290': 290,
  '490': 690,
  '1190': 1390,
};

function formatDate(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

/**
 * Отправить сообщение в Telegram
 */
async function sendMessage(telegramId, text, replyMarkup) {
  if (!BOT_TOKEN) return;
  const body = { chat_id: telegramId, text, parse_mode: 'HTML' };
  if (replyMarkup) body.reply_markup = replyMarkup;

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(`cron: failed to send message to ${telegramId}:`, err.message);
  }
}

/**
 * Попытка рекуррентного списания через YooKassa
 */
async function tryRecurringPayment(user) {
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) return { success: false, reason: 'no_credentials' };
  if (!user.payment_method_id) return { success: false, reason: 'no_payment_method' };
  if (!user.tariff || !RECURRING_PRICES[user.tariff]) return { success: false, reason: 'invalid_tariff' };

  const amount = RECURRING_PRICES[user.tariff];
  const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');

  try {
    const res = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Idempotence-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        amount: { value: amount.toFixed(2), currency: 'RUB' },
        capture: true,
        payment_method_id: user.payment_method_id,
        description: `Автопродление подписки Суши-Хаус 39 (${user.tariff}₽)`,
        receipt: {
          customer: (() => {
            if (!user.phone) return { email: 'order@sushi-house-39.ru' };
            let d = user.phone.replace(/[^\d]/g, '');
            if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1);
            if (d.length === 10) d = '7' + d;
            return (d.length === 11 && d.startsWith('7')) ? { phone: `+${d}` } : { email: 'order@sushi-house-39.ru' };
          })(),
          items: [
            {
              description: `Автопродление подписки Суши-Хаус 39 (${user.tariff}₽)`,
              quantity: '1.00',
              amount: { value: amount.toFixed(2), currency: 'RUB' },
              vat_code: 1,
              payment_subject: 'service',
              payment_mode: 'full_payment',
            },
          ],
        },
        metadata: {
          telegram_id: String(user.telegram_id),
          tarif: String(user.tariff),
          months: '1',
          recurring: 'true',
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`cron: YooKassa error for ${user.telegram_id}:`, res.status, errText);
      return { success: false, reason: 'api_error' };
    }

    const data = await res.json();

    if (data.status === 'succeeded') {
      return { success: true, paymentId: data.id, amount };
    }

    // Если pending — webhook обработает позже
    if (data.status === 'pending') {
      console.log(`cron: payment pending for ${user.telegram_id}, webhook will handle`);
      return { success: true, pending: true, paymentId: data.id, amount };
    }

    return { success: false, reason: data.status };
  } catch (err) {
    console.error(`cron: recurring payment error for ${user.telegram_id}:`, err.message);
    return { success: false, reason: 'network_error' };
  }
}

/**
 * Основная функция cron-задачи
 */
async function runSubscriptionCron() {
  const startTime = Date.now();
  console.log('cron: starting subscription check at', new Date().toISOString());

  const results = { reminded1: 0, renewed: 0, deactivated: 0, errors: 0 };

  // 1. Напоминание за 1 день
  try {
    const expiring1 = await getExpiringSubscriptions(1);
    for (const user of expiring1) {
      await sendMessage(
        user.telegram_id,
        `⚠️ <b>Подписка заканчивается завтра!</b>\n\nВаша подписка (${user.tariff}₽) истекает ${user.subscription_end}.\n\n${user.payment_method_id ? '💳 Завтра произойдёт автоматическое списание.' : '❗ Успейте продлить, чтобы сохранить скидки и подарки!'}`,
        {
          inline_keyboard: [
            user.payment_method_id ? [] : [{ text: '🔄 Продлить сейчас', url: `https://sushi-house-39.ru/pay/${user.tariff}?telegram_id=${user.telegram_id}` }],
            [{ text: '🏠 Главное меню', callback_data: '/start' }],
          ].filter(row => row.length > 0),
        }
      );
      results.reminded1++;
    }
  } catch (err) {
    console.error('cron: error in 1-day reminder:', err.message);
    results.errors++;
  }

  // 3. День окончания: рекуррентное списание или деактивация
  try {
    const expiredToday = await getExpiredToday();
    for (const user of expiredToday) {
      if (user.payment_method_id) {
        // Есть сохранённый метод оплаты — пробуем списать
        const result = await tryRecurringPayment(user);

        if (result.success && !result.pending) {
          // Списание прошло — продлеваем подписку
          const newEnd = new Date();
          newEnd.setDate(newEnd.getDate() + 30);
          const newEndStr = formatDate(newEnd);

          await renewSubscription(user.telegram_id, newEndStr);

          // Записываем платёж в БД
          const paymentDbId = await recordPayment({
            telegram_id: user.telegram_id,
            tariff: user.tariff,
            amount: result.amount,
            months: 1,
            yookassa_payment_id: result.paymentId,
          });

          // Начисляем 20% SHC пригласившему
          await processReferralSHC(String(user.telegram_id), result.amount);

          await sendMessage(
            user.telegram_id,
            `✅ <b>Подписка продлена!</b>\n\n💳 Автосписание ${result.amount}₽ прошло успешно.\n📅 Новая дата окончания: ${newEndStr}\n\nПриятного аппетита! 🍣`,
            { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: '/start' }]] }
          );
          results.renewed++;
          console.log(`cron: renewed subscription for ${user.telegram_id} until ${newEndStr}`);

        } else if (result.pending) {
          // Pending — webhook обработает, ничего не делаем
          console.log(`cron: payment pending for ${user.telegram_id}, skipping deactivation`);

        } else {
          // Списание не прошло — деактивируем
          await deactivateSubscription(user.telegram_id);
          await sendMessage(
            user.telegram_id,
            `❌ <b>Не удалось продлить подписку</b>\n\nАвтосписание не прошло. Подписка (${user.tariff}₽) деактивирована.\n\n💡 Вы можете продлить подписку вручную:`,
            {
              inline_keyboard: [
                [{ text: '🔄 Продлить подписку', url: `https://sushi-house-39.ru/pay/${user.tariff}?telegram_id=${user.telegram_id}` }],
                [{ text: '🏠 Главное меню', callback_data: '/start' }],
              ],
            }
          );
          results.deactivated++;
          console.log(`cron: deactivated subscription for ${user.telegram_id} (reason: ${result.reason})`);
        }
      } else {
        // Нет метода оплаты — деактивируем
        await deactivateSubscription(user.telegram_id);
        await sendMessage(
          user.telegram_id,
          `📛 <b>Подписка истекла</b>\n\nВаша подписка (${user.tariff}₽) закончилась.\n\n💡 Продлите, чтобы снова получать скидки и подарки:`,
          {
            inline_keyboard: [
              [{ text: '🔄 Продлить подписку', url: `https://sushi-house-39.ru/pay/${user.tariff}?telegram_id=${user.telegram_id}` }],
              [{ text: '🏠 Главное меню', callback_data: '/start' }],
            ],
          }
        );
        results.deactivated++;
        console.log(`cron: deactivated subscription for ${user.telegram_id} (no payment method)`);
      }
    }
  } catch (err) {
    console.error('cron: error in expiration processing:', err.message);
    results.errors++;
  }

  const duration = Date.now() - startTime;
  console.log(`cron: finished in ${duration}ms`, results);
  return results;
}

// Экспорт как HTTP-эндпоинт (для ручного запуска и мониторинга)
module.exports = async (req, res) => {
  // Проверка авторизации (простой секрет)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['x-cron-secret'] || req.query?.secret;

  if (cronSecret && authHeader !== cronSecret) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const results = await runSubscriptionCron();
    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('cron endpoint error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
};

// Экспорт функции для вызова из server.js (cron)
module.exports.runSubscriptionCron = runSubscriptionCron;
