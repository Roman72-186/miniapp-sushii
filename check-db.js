// check-db.js - Проверка данных в БД
const { getDb } = require('./api/_lib/db');

const db = getDb();

console.log('=== Users ===');
const users = db.prepare('SELECT telegram_id, name, tariff, subscription_status, subscription_start, subscription_end FROM users').all();
console.log('Count:', users.length);
console.log(JSON.stringify(users, null, 2));
