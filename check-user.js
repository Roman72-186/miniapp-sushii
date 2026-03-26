const db = require('/root/miniapp-sushii/api/_lib/db');
const user = db.getUser('5262862655');
console.log('subscription_status:', user.subscription_status);
console.log('tariff:', user.tariff);
console.log('has_both:', user.subscription_status === 'активно' && user.tariff);
