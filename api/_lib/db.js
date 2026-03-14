// api/_lib/db.js — SQLite база данных (better-sqlite3)
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'sushii.db');

let _db = null;

function getDb() {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  // Создание таблиц
  _db.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by);
    CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON payments(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_ambassador ON transactions(ambassador_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_referral ON transactions(referral_id);
  `);

  return _db;
}

// ─── Users ───────────────────────────────────────────────

function upsertUser(data) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO users (telegram_id, name, phone, tariff, invited_by, is_ambassador,
                       subscription_status, subscription_start, subscription_end,
                       payment_method_id, ref_url, watbot_contact_id, updated_at)
    VALUES (@telegram_id, @name, @phone, @tariff, @invited_by, @is_ambassador,
            @subscription_status, @subscription_start, @subscription_end,
            @payment_method_id, @ref_url, @watbot_contact_id, datetime('now'))
    ON CONFLICT(telegram_id) DO UPDATE SET
      name = COALESCE(@name, users.name),
      phone = COALESCE(@phone, users.phone),
      tariff = COALESCE(@tariff, users.tariff),
      invited_by = COALESCE(users.invited_by, @invited_by),
      is_ambassador = COALESCE(@is_ambassador, users.is_ambassador),
      subscription_status = COALESCE(@subscription_status, users.subscription_status),
      subscription_start = COALESCE(@subscription_start, users.subscription_start),
      subscription_end = COALESCE(@subscription_end, users.subscription_end),
      payment_method_id = COALESCE(@payment_method_id, users.payment_method_id),
      ref_url = COALESCE(@ref_url, users.ref_url),
      watbot_contact_id = COALESCE(@watbot_contact_id, users.watbot_contact_id),
      updated_at = datetime('now')
  `);
  return stmt.run({
    telegram_id: String(data.telegram_id),
    name: data.name || null,
    phone: data.phone || null,
    tariff: data.tariff || null,
    invited_by: data.invited_by || null,
    is_ambassador: data.is_ambassador ? 1 : 0,
    subscription_status: data.subscription_status || null,
    subscription_start: data.subscription_start || null,
    subscription_end: data.subscription_end || null,
    payment_method_id: data.payment_method_id || null,
    ref_url: data.ref_url || null,
    watbot_contact_id: data.watbot_contact_id || null,
  });
}

function getUser(telegramId) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(String(telegramId)) || null;
}

function getUserByContactId(contactId) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE watbot_contact_id = ?').get(String(contactId)) || null;
}

function updateBalance(telegramId, amount) {
  const db = getDb();
  db.prepare(`
    UPDATE users SET balance_shc = balance_shc + ?, updated_at = datetime('now')
    WHERE telegram_id = ?
  `).run(amount, String(telegramId));
}

function getReferrals(telegramId) {
  const db = getDb();
  return db.prepare(`
    SELECT telegram_id, name, phone, tariff, is_ambassador, created_at
    FROM users WHERE invited_by = ?
    ORDER BY created_at DESC
  `).all(String(telegramId));
}

function setInvitedBy(telegramId, ambassadorId) {
  const db = getDb();
  db.prepare(`
    UPDATE users SET invited_by = ?, updated_at = datetime('now')
    WHERE telegram_id = ? AND invited_by IS NULL
  `).run(String(ambassadorId), String(telegramId));
}

// ─── Payments ────────────────────────────────────────────

function recordPayment(data) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO payments (telegram_id, tariff, amount, months, yookassa_payment_id, status)
    VALUES (@telegram_id, @tariff, @amount, @months, @yookassa_payment_id, @status)
  `);
  const result = stmt.run({
    telegram_id: String(data.telegram_id),
    tariff: String(data.tariff),
    amount: Number(data.amount),
    months: Number(data.months) || 1,
    yookassa_payment_id: data.yookassa_payment_id || null,
    status: data.status || 'succeeded',
  });
  return result.lastInsertRowid;
}

// ─── Transactions (комиссии) ─────────────────────────────

function recordTransaction(data) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO transactions (ambassador_id, referral_id, payment_id,
                              payment_amount, commission_amount, commission_percent, level)
    VALUES (@ambassador_id, @referral_id, @payment_id,
            @payment_amount, @commission_amount, @commission_percent, @level)
  `);
  return stmt.run({
    ambassador_id: String(data.ambassador_id),
    referral_id: String(data.referral_id),
    payment_id: data.payment_id || null,
    payment_amount: Number(data.payment_amount),
    commission_amount: Number(data.commission_amount),
    commission_percent: Number(data.commission_percent),
    level: Number(data.level) || 1,
  });
}

function getTransactions(ambassadorId, limit = 50) {
  const db = getDb();
  return db.prepare(`
    SELECT t.*, u.name as referral_name
    FROM transactions t
    LEFT JOIN users u ON u.telegram_id = t.referral_id
    WHERE t.ambassador_id = ?
    ORDER BY t.created_at DESC
    LIMIT ?
  `).all(String(ambassadorId), limit);
}

function getTotalEarnings(ambassadorId) {
  const db = getDb();
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(commission_amount), 0) as total,
      COALESCE(SUM(CASE WHEN level = 1 THEN commission_amount ELSE 0 END), 0) as level1,
      COALESCE(SUM(CASE WHEN level = 2 THEN commission_amount ELSE 0 END), 0) as level2
    FROM transactions WHERE ambassador_id = ?
  `).get(String(ambassadorId));
  return row;
}

// ─── Комиссии при оплате ─────────────────────────────────

/**
 * Начисляет комиссии амбассадорам при оплате реферала.
 * Вызывается из webhook после успешного платежа.
 * @returns {Array} массив начисленных транзакций
 */
function processCommissions(referralTelegramId, paymentAmount, paymentId) {
  const db = getDb();
  const results = [];

  const referral = getUser(referralTelegramId);
  if (!referral || !referral.invited_by) return results;

  // Level 1: 30% амбассадору, который пригласил
  const ambassador = getUser(referral.invited_by);
  if (!ambassador || !ambassador.is_ambassador) return results;

  const commission1 = Math.round(paymentAmount * 0.30 * 100) / 100;

  const txn = db.transaction(() => {
    // Начисляем Level 1
    recordTransaction({
      ambassador_id: ambassador.telegram_id,
      referral_id: referralTelegramId,
      payment_id: paymentId,
      payment_amount: paymentAmount,
      commission_amount: commission1,
      commission_percent: 30,
      level: 1,
    });
    updateBalance(ambassador.telegram_id, commission1);
    results.push({ level: 1, ambassador: ambassador.telegram_id, amount: commission1 });

    // Level 2: 5% «дедушке» (кто пригласил амбассадора)
    if (ambassador.invited_by) {
      const grandAmbassador = getUser(ambassador.invited_by);
      if (grandAmbassador && grandAmbassador.is_ambassador) {
        // Проверяем, что у «дедушки» >= 10 амбассадоров
        const ambReferrals = getReferrals(grandAmbassador.telegram_id);
        const ambCount = ambReferrals.filter(r => r.is_ambassador).length;
        if (ambCount >= 10) {
          const commission2 = Math.round(paymentAmount * 0.05 * 100) / 100;
          recordTransaction({
            ambassador_id: grandAmbassador.telegram_id,
            referral_id: referralTelegramId,
            payment_id: paymentId,
            payment_amount: paymentAmount,
            commission_amount: commission2,
            commission_percent: 5,
            level: 2,
          });
          updateBalance(grandAmbassador.telegram_id, commission2);
          results.push({ level: 2, ambassador: grandAmbassador.telegram_id, amount: commission2 });
        }
      }
    }
  });

  txn();
  return results;
}

module.exports = {
  getDb,
  upsertUser,
  getUser,
  getUserByContactId,
  updateBalance,
  getReferrals,
  setInvitedBy,
  recordPayment,
  recordTransaction,
  getTransactions,
  getTotalEarnings,
  processCommissions,
};
