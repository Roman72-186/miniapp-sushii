const {getDb} = require('./api/_lib/db');
const db = getDb();

const telegramId = '301932146';
const watbotContactId = '4797635';
const name = 'Ксения Сайфутдинова';
const phone = '79210099717';
const tariff = '490';
const subscriptionStart = '03.03.2026';
const subscriptionEnd = '01.06.2026';

let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);

if (user) {
  console.log('User exists, updating...');
  db.prepare(`UPDATE users SET 
    tariff=?, 
    subscription_status='активно', 
    subscription_start=?, 
    subscription_end=?, 
    watbot_contact_id=?, 
    phone=?, 
    name=?, 
    updated_at=datetime('now') 
  WHERE telegram_id=?`).run(tariff, subscriptionStart, subscriptionEnd, watbotContactId, phone, name, telegramId);
} else {
  console.log('Creating new user...');
  db.prepare(`INSERT INTO users (
    telegram_id, name, phone, tariff, subscription_status, 
    subscription_start, subscription_end, watbot_contact_id, 
    balance_shc, is_ambassador, created_at, updated_at
  ) VALUES (?, ?, ?, ?, 'активно', ?, ?, ?, 0, 0, datetime('now'), datetime('now'))`).run(telegramId, name, phone, tariff, subscriptionStart, subscriptionEnd, watbotContactId);
}

user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
console.log('User:', JSON.stringify(user, null, 2));
