/**
 * Скрипт миграции данных из Supabase в локальную SQLite базу данных
 * 
 * Использование:
 *   node scripts/migrate-from-supabase.js
 * 
 * Требования:
 *   npm install @supabase/supabase-js better-sqlite3 dotenv
 * 
 * Переменные окружения (.env):
 *   SUPABASE_URL=https://your-project.supabase.co
 *   SUPABASE_ANON_KEY=your-anon-key
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

const DB_PATH = path.join(__dirname, '..', 'data', 'sushii.db');
const BACKUP_PATH = path.join(__dirname, '..', 'data', 'sushii.backup.db');

// Таблицы для миграции
const TABLES_TO_MIGRATE = [
  'users',
  'payments',
  'transactions',
  'referral_bonuses',
];

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Ошибка: Не указаны SUPABASE_URL или SUPABASE_KEY в .env');
  console.log('');
  console.log('Создайте файл .env и добавьте:');
  console.log('  SUPABASE_URL=https://your-project.supabase.co');
  console.log('  SUPABASE_KEY=your-anon-key-or-service-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Создаём директорию для БД если не существует
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`📁 Создана директория: ${dbDir}`);
}

// Создаём резервную копию существующей БД
if (fs.existsSync(DB_PATH)) {
  fs.copyFileSync(DB_PATH, BACKUP_PATH);
  console.log(`💾 Резервная копия создана: ${BACKUP_PATH}`);
}

// Инициализируем SQLite
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============================================
// СОЗДАНИЕ ТАБЛИЦ
// ============================================

console.log('📋 Создание таблиц SQLite...');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    tariff TEXT,
    invited_by TEXT,
    balance_shc REAL DEFAULT 0,
    is_ambassador INTEGER DEFAULT 0,
    subscription_status TEXT,
    subscription_start TEXT,
    subscription_end TEXT,
    payment_method_id TEXT,
    ref_url TEXT,
    watbot_contact_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT NOT NULL,
    tariff TEXT NOT NULL,
    amount REAL NOT NULL,
    months INTEGER DEFAULT 1,
    yookassa_payment_id TEXT,
    status TEXT DEFAULT 'succeeded',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ambassador_id TEXT NOT NULL,
    referral_id TEXT NOT NULL,
    payment_id INTEGER,
    payment_amount REAL NOT NULL,
    commission_amount REAL NOT NULL,
    commission_percent REAL NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (ambassador_id) REFERENCES users(telegram_id),
    FOREIGN KEY (referral_id) REFERENCES users(telegram_id),
    FOREIGN KEY (payment_id) REFERENCES payments(id)
  );

  CREATE TABLE IF NOT EXISTS referral_bonuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    referral_id TEXT NOT NULL,
    base_amount REAL NOT NULL DEFAULT 50,
    threshold_bonus REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    friends_count INTEGER NOT NULL,
    achievement TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(telegram_id),
    FOREIGN KEY (referral_id) REFERENCES users(telegram_id)
  );

  CREATE INDEX IF NOT EXISTS idx_referral_bonuses_user ON referral_bonuses(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by);
  CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON payments(telegram_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_ambassador ON transactions(ambassador_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_referral ON transactions(referral_id);
`);

console.log('✅ Таблицы созданы');

// ============================================
// ФУНКЦИИ МИГРАЦИИ
// ============================================

/**
 * Преобразует дату из формата Supabase в локальный формат
 */
function normalizeDate(dateStr) {
  if (!dateStr) return null;
  
  // Если уже в формате DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  
  // ISO формат (2026-03-20T10:00:00Z)
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
  } catch (e) {
    return null;
  }
}

/**
 * Миграция пользователей из Supabase
 */
async function migrateUsers() {
  console.log('');
  console.log('👥 Миграция пользователей...');
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('❌ Ошибка получения пользователей:', error.message);
    return 0;
  }
  
  if (!data || data.length === 0) {
    console.log('⚠️ Пользователи не найдены');
    return 0;
  }
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO users (
      telegram_id, name, phone, tariff, invited_by, balance_shc,
      is_ambassador, subscription_status, subscription_start, subscription_end,
      payment_method_id, ref_url, watbot_contact_id, created_at, updated_at
    ) VALUES (
      @telegram_id, @name, @phone, @tariff, @invited_by, @balance_shc,
      @is_ambassador, @subscription_status, @subscription_start, @subscription_end,
      @payment_method_id, @ref_url, @watbot_contact_id, @created_at, @updated_at
    )
  `);
  
  let success = 0;
  let failed = 0;
  
  const insertMany = db.transaction((users) => {
    for (const user of users) {
      try {
        insertUser(stmt, user);
        success++;
      } catch (e) {
        failed++;
        console.error(`  ❌ Ошибка для user ${user.telegram_id}:`, e.message);
      }
    }
  });
  
  // Разбиваем на батчи по 100 записей
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    insertMany(batch);
    console.log(`  📊 Обработано: ${Math.min(i + batchSize, data.length)} / ${data.length}`);
  }
  
  console.log(`✅ Пользователи мигрированы: ${success} успешно, ${failed} ошибок`);
  return success;
}

function insertUser(stmt, user) {
  // Маппинг полей Supabase -> SQLite
  const data = {
    telegram_id: String(user.telegram_id || user.id),
    name: user.name || user.username || null,
    phone: user.phone || null,
    tariff: user.tariff || user.subscription_plan || null,
    invited_by: user.invited_by || user.referrer_id || null,
    balance_shc: user.balance_shc || user.balance || 0,
    is_ambassador: user.is_ambassador ? 1 : 0,
    subscription_status: user.subscription_status || null,
    subscription_start: normalizeDate(user.subscription_start),
    subscription_end: normalizeDate(user.subscription_end),
    payment_method_id: user.payment_method_id || null,
    ref_url: user.ref_url || null,
    watbot_contact_id: user.watbot_contact_id || null,
    created_at: user.created_at ? normalizeDate(user.created_at) : null,
    updated_at: user.updated_at ? normalizeDate(user.updated_at) : null,
  };
  
  stmt.run(data);
}

/**
 * Миграция платежей из Supabase
 */
async function migratePayments() {
  console.log('');
  console.log('💳 Миграция платежей...');
  
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('❌ Ошибка получения платежей:', error.message);
    return 0;
  }
  
  if (!data || data.length === 0) {
    console.log('⚠️ Платежи не найдены');
    return 0;
  }
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO payments (
      id, telegram_id, tariff, amount, months,
      yookassa_payment_id, status, created_at
    ) VALUES (
      @id, @telegram_id, @tariff, @amount, @months,
      @yookassa_payment_id, @status, @created_at
    )
  `);
  
  let success = 0;
  
  for (const payment of data) {
    try {
      stmt.run({
        id: payment.id,
        telegram_id: String(payment.telegram_id),
        tariff: payment.tariff || payment.plan,
        amount: payment.amount || payment.total,
        months: payment.months || 1,
        yookassa_payment_id: payment.yookassa_payment_id || payment.external_id,
        status: payment.status || 'succeeded',
        created_at: payment.created_at,
      });
      success++;
    } catch (e) {
      console.error(`  ❌ Ошибка для payment ${payment.id}:`, e.message);
    }
  }
  
  console.log(`✅ Платежи мигрированы: ${success} / ${data.length}`);
  return success;
}

/**
 * Миграция транзакций из Supabase
 */
async function migrateTransactions() {
  console.log('');
  console.log('💰 Миграция транзакций...');
  
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('❌ Ошибка получения транзакций:', error.message);
    return 0;
  }
  
  if (!data || data.length === 0) {
    console.log('⚠️ Транзакции не найдены');
    return 0;
  }
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO transactions (
      id, ambassador_id, referral_id, payment_id,
      payment_amount, commission_amount, commission_percent, level, created_at
    ) VALUES (
      @id, @ambassador_id, @referral_id, @payment_id,
      @payment_amount, @commission_amount, @commission_percent, @level, @created_at
    )
  `);
  
  let success = 0;
  
  for (const txn of data) {
    try {
      stmt.run({
        id: txn.id,
        ambassador_id: String(txn.ambassador_id || txn.user_id),
        referral_id: String(txn.referral_id),
        payment_id: txn.payment_id,
        payment_amount: txn.payment_amount,
        commission_amount: txn.commission_amount,
        commission_percent: txn.commission_percent,
        level: txn.level || 1,
        created_at: txn.created_at,
      });
      success++;
    } catch (e) {
      console.error(`  ❌ Ошибка для transaction ${txn.id}:`, e.message);
    }
  }
  
  console.log(`✅ Транзакции мигрированы: ${success} / ${data.length}`);
  return success;
}

/**
 * Миграция бонусов из Supabase
 */
async function migrateReferralBonuses() {
  console.log('');
  console.log('🎁 Миграция бонусов...');
  
  const { data, error } = await supabase
    .from('referral_bonuses')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('❌ Ошибка получения бонусов:', error.message);
    return 0;
  }
  
  if (!data || data.length === 0) {
    console.log('⚠️ Бонусы не найдены');
    return 0;
  }
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO referral_bonuses (
      id, user_id, referral_id, base_amount, threshold_bonus,
      total_amount, friends_count, achievement, created_at
    ) VALUES (
      @id, @user_id, @referral_id, @base_amount, @threshold_bonus,
      @total_amount, @friends_count, @achievement, @created_at
    )
  `);
  
  let success = 0;
  
  for (const bonus of data) {
    try {
      stmt.run({
        id: bonus.id,
        user_id: String(bonus.user_id),
        referral_id: String(bonus.referral_id),
        base_amount: bonus.base_amount || 50,
        threshold_bonus: bonus.threshold_bonus || 0,
        total_amount: bonus.total_amount,
        friends_count: bonus.friends_count,
        achievement: bonus.achievement,
        created_at: bonus.created_at,
      });
      success++;
    } catch (e) {
      console.error(`  ❌ Ошибка для bonus ${bonus.id}:`, e.message);
    }
  }
  
  console.log(`✅ Бонусы мигрированы: ${success} / ${data.length}`);
  return success;
}

// ============================================
// СТАТИСТИКА
// ============================================

function printStats() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 СТАТИСТИКА МИГРАЦИИ');
  console.log('═══════════════════════════════════════════════════════');
  
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const payments = db.prepare('SELECT COUNT(*) as count FROM payments').get().count;
  const transactions = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
  const bonuses = db.prepare('SELECT COUNT(*) as count FROM referral_bonuses').get().count;
  
  const activeSubs = db.prepare(`
    SELECT COUNT(*) as count FROM users 
    WHERE subscription_status = 'активно'
  `).get().count;
  
  const ambassadors = db.prepare(`
    SELECT COUNT(*) as count FROM users 
    WHERE is_ambassador = 1
  `).get().count;
  
  console.log(`👥 Пользователей:        ${users}`);
  console.log(`💳 Платежей:            ${payments}`);
  console.log(`💰 Транзакций:          ${transactions}`);
  console.log(`🎁 Бонусов:             ${bonuses}`);
  console.log('───────────────────────────────────────────────────────');
  console.log(`✅ Активных подписок:   ${activeSubs}`);
  console.log(`🌟 Амбассадоров:        ${ambassadors}`);
  console.log('═══════════════════════════════════════════════════════');
}

// ============================================
// ЗАПУСК МИГРАЦИИ
// ============================================

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   МИГРАЦИЯ ДАННЫХ ИЗ SUPABASE В SQLITE                ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📡 Supabase URL: ${SUPABASE_URL}`);
  console.log(`📁 SQLite DB: ${DB_PATH}`);
  
  try {
    // Мигрируем таблицы
    await migrateUsers();
    await migratePayments();
    await migrateTransactions();
    await migrateReferralBonuses();
    
    // Выводим статистику
    printStats();
    
    console.log('');
    console.log('✅ Миграция завершена успешно!');
    console.log('');
    console.log('📝 Следующие шаги:');
    console.log('   1. Проверьте данные в базе: node check-db.js');
    console.log('   2. Перезапустите приложение: docker-compose restart');
    console.log('   3. При необходимости удалите резервную копию');
    
  } catch (error) {
    console.error('');
    console.error('❌ Критическая ошибка миграции:', error.message);
    console.error('');
    console.error('Восстановление из резервной копии...');
    
    if (fs.existsSync(BACKUP_PATH)) {
      fs.copyFileSync(BACKUP_PATH, DB_PATH);
      console.log('✅ База данных восстановлена из backup');
    }
    
    process.exit(1);
  } finally {
    db.close();
  }
}

// Запуск
main();
