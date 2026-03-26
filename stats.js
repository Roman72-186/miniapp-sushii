const db = require('/root/miniapp-sushii/api/_lib/db');
const users = db.getAllUsers();
const active = users.filter(u => u.subscription_status === 'активно');
const ambassadors = users.filter(u => u.is_ambassador === 1);

console.log('═══════════════════════════════════════════════════════');
console.log('📊 СВОДКА ПО БАЗЕ ДАННЫХ');
console.log('═══════════════════════════════════════════════════════');
console.log('Всего пользователей:', users.length);
console.log('Активных подписок:', active.length);
console.log('Амбассадоров:', ambassadors.length);
console.log('───────────────────────────────────────────────────────');
console.log('📋 АКТИВНЫЕ ПОЛЬЗОВАТЕЛИ:');
active.forEach(u => console.log('  •', u.telegram_id, '|', u.name || '—', '| Тариф:', u.tariff || '—', '|', u.subscription_start, '-', u.subscription_end));
console.log('═══════════════════════════════════════════════════════');
