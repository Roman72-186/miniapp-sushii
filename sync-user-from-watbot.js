// sync-user-from-watbot.js — Синхронизация пользователя из Watbot
const { getDb } = require('./api/_lib/db');

const telegramId = '301932146';
const watbotContactId = '4797635';
const name = 'Ксения Сайфутдинова';
const phone = '79210099717';
const tariff = '490';
const subscriptionStart = '03.03.2026';
const subscriptionEnd = '01.06.2026';

const db = getDb();

const result = db.prepare(`
  UPDATE users SET
    tariff = ?,
    subscription_status = 'активно',
    subscription_start = ?,
    subscription_end = ?,
    watbot_contact_id = ?,
    phone = ?,
    name = ?,
    updated_at = datetime('now')
  WHERE telegram_id = ?
`).run(tariff, subscriptionStart, subscriptionEnd, watbotContactId, phone, name, telegramId);

console.log(`Updated ${result.changes} row(s)`);

const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
console.log('User data:', JSON.stringify(user, null, 2));
