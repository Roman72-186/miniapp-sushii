// Скрипт для добавления/обновления пользователя @antnmndd
// Дата начала: 20.03.2026, Дата окончания: 20.04.2026
// Полный доступ ко всем функциям

const {getDb} = require('./api/_lib/db');
const db = getDb();

// ============================================
// ВВЕДИТЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
// ============================================
const telegramId = ''; // Укажите telegram_id пользователя @antnmndd
const watbotContactId = ''; // Укажите watbot_contact_id (если известен)
const name = '@antnmndd';
const phone = ''; // Укажите телефон (если известен)

// Параметры подписки
const tariff = '490'; // Тариф (490, 1190, 9990)
const subscriptionStart = '20.03.2026'; // Дата начала
const subscriptionEnd = '20.04.2026'; // Дата окончания
// ============================================

if (!telegramId) {
  console.error('❌ Ошибка: Необходимо указать telegram_id пользователя');
  console.log('');
  console.log('Для получения telegram_id:');
  console.log('1. Попросите пользователя запустить бота');
  console.log('2. Проверьте логи бота или базу данных');
  console.log('3. Или используйте API: https://api.telegram.org/bot<BOT_TOKEN>/getUpdates');
  process.exit(1);
}

let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);

if (user) {
  console.log('✅ Пользователь найден, обновляем данные...');
  console.log('Текущие данные:', JSON.stringify(user, null, 2));
  console.log('');
  
  db.prepare(`UPDATE users SET
    name = ?,
    phone = ?,
    tariff = ?,
    subscription_status = 'активно',
    subscription_start = ?,
    subscription_end = ?,
    watbot_contact_id = COALESCE(?, watbot_contact_id),
    updated_at = datetime('now')
  WHERE telegram_id = ?`).run(name, phone, tariff, subscriptionStart, subscriptionEnd, watbotContactId, telegramId);
  
  console.log('✅ Пользователь обновлён');
} else {
  console.log('ℹ️ Пользователь не найден, создаём нового...');
  
  if (!watbotContactId) {
    console.log('⚠️ watbot_contact_id не указан, оставляем NULL');
  }
  
  db.prepare(`INSERT INTO users (
    telegram_id, name, phone, tariff, subscription_status,
    subscription_start, subscription_end, watbot_contact_id,
    balance_shc, is_ambassador, ref_url, created_at, updated_at
  ) VALUES (?, ?, ?, ?, 'активно', ?, ?, ?, 0, 0, '', datetime('now'), datetime('now'))`).run(
    telegramId, name, phone, tariff, subscriptionStart, subscriptionEnd, watbotContactId
  );
  
  console.log('✅ Пользователь создан');
}

user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
console.log('');
console.log('📋 Итоговые данные пользователя:');
console.log('═══════════════════════════════════════════════════════');
console.log(`Telegram ID:        ${user.telegram_id}`);
console.log(`Имя:                ${user.name}`);
console.log(`Телефон:            ${user.phone || '—'}`);
console.log(`Тариф:              ${user.tariff}₽`);
console.log(`Статус подписки:    ${user.subscription_status}`);
console.log(`Дата начала:        ${user.subscription_start}`);
console.log(`Дата окончания:     ${user.subscription_end}`);
console.log(`Watbot Contact ID:  ${user.watbot_contact_id || '—'}`);
console.log(`Баланс SHC:         ${user.balance_shc}`);
console.log(`Амбассадор:         ${user.is_ambassador ? 'Да' : 'Нет'}`);
console.log(`Реф. ссылка:        ${user.ref_url || '—'}`);
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('✅ Пользователь имеет полный доступ ко всем функциям!');
