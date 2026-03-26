const db = require('/root/miniapp-sushii/api/_lib/db');
const users = db.getAllUsers().filter(u => u.subscription_status === 'активно');
console.log('Active users:', users.length);
users.forEach(u => console.log(u.telegram_id, u.name, u.tariff));
