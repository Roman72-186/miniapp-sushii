// create-test-user.js - Создать тестового пользователя
const { getDb } = require('./api/_lib/db');

const telegramId = process.argv[2] || '5444227047';
const tariff = process.argv[3] || '490';
const endDate = process.argv[4] || '30.03.2026';

const db = getDb();

db.prepare(`
  INSERT OR REPLACE INTO users (
    telegram_id, name, phone, tariff, is_ambassador,
    subscription_status, subscription_start, subscription_end,
    payment_method_id, balance_shc
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  telegramId,
  'Test User',
  '79991234567',
  tariff,
  0,
  'активно',
  '01.03.2026',
  endDate,
  'pm_test123',
  0
);

const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
console.log('User created:', JSON.stringify(user, null, 2));
