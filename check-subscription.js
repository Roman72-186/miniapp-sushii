const { deriveFromDbUser } = require('/root/miniapp-sushii/api/_lib/subscription-state');
const db = require('/root/miniapp-sushii/api/_lib/db');

const user = db.getUser('5262862655');
console.log('User from DB:', {
  tariff: user.tariff,
  subscription_status: user.subscription_status,
  subscription_start: user.subscription_start,
  subscription_end: user.subscription_end,
});

const derived = deriveFromDbUser(user);
console.log('Derived subscription state:', derived);
