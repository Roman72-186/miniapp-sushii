const db = require('/root/miniapp-sushii/api/_lib/db');
const u = db.getUser('831436106');
console.log('User:', u.name, '| Tariff:', u.tariff, '| Status:', u.subscription_status);
console.log('Period:', u.subscription_start, '-', u.subscription_end);
