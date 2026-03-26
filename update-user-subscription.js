// update-user-subscription.js — Обновление подписки пользователя
const { getDb } = require('./api/_lib/db');

const telegramId = process.argv[2] || '301932146';
const tariff = process.argv[3] || '290';
const startDate = process.argv[4] || '25.03.2026';
const endDate = process.argv[5] || '24.04.2026';

const db = getDb();

const result = db.prepare(`
  UPDATE users SET
    tariff = ?,
    subscription_status = 'активно',
    subscription_start = ?,
    subscription_end = ?,
    updated_at = datetime('now')
  WHERE telegram_id = ?
`).run(tariff, startDate, endDate, telegramId);

if (result.changes > 0) {
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
  console.log('✅ Пользователь обновлен:');
  console.log(JSON.stringify({
    telegram_id: user.telegram_id,
    tariff: user.tariff,
    subscription_status: user.subscription_status,
    subscription_start: user.subscription_start,
    subscription_end: user.subscription_end
  }, null, 2));
} else {
  console.log('❌ Пользователь не найден');
}
