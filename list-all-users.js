const db = require('/root/miniapp-sushii/api/_lib/db');
const users = db.getAllUsers();

console.log('=== ВСЕ ПОЛЬЗОВАТЕЛИ ===\n');

users.forEach((u, i) => {
  console.log((i+1) + '. ' + u.name);
  console.log('   Telegram ID: ' + u.telegram_id);
  console.log('   Тариф: ' + (u.tariff || '—') + '₽');
  console.log('   Статус: ' + (u.subscription_status || '—'));
  console.log('   Период: ' + (u.subscription_start || '—') + ' — ' + (u.subscription_end || '—'));
  console.log('   Амба: ' + (u.is_ambassador ? '✓' : '—'));
  console.log('');
});

console.log('Всего: ' + users.length + ' польз.');
