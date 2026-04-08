// api/_lib/db.js — SQLite база данных (better-sqlite3)
if (process.env.USE_SUPABASE === 'true') {
  module.exports = require('./db-pg');
  return;
}

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

    CREATE TABLE IF NOT EXISTS gift_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT    NOT NULL,
      gift_type   TEXT    NOT NULL,
      claimed_at  TEXT    NOT NULL,
      claimed_ts  TEXT    NOT NULL,
      window_num  INTEGER,
      granted_by  TEXT    DEFAULT 'user',
      created_at  TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
    );

    CREATE INDEX IF NOT EXISTS idx_referral_bonuses_user ON referral_bonuses(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by);
    CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON payments(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_ambassador ON transactions(ambassador_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_referral ON transactions(referral_id);
    CREATE INDEX IF NOT EXISTS idx_gift_history_telegram ON gift_history(telegram_id);
  `);

  // Миграции: добавить новые колонки если нет
  try { _db.exec('ALTER TABLE users ADD COLUMN partner_code TEXT'); } catch {}
  try { _db.exec('ALTER TABLE users ADD COLUMN notes TEXT'); } catch {}
  try { _db.exec('ALTER TABLE gift_history ADD COLUMN address TEXT'); } catch {}
  try { _db.exec('ALTER TABLE gift_history ADD COLUMN gift_name TEXT'); } catch {}

  return _db;
}

function generatePartnerCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getPartnerByCode(code) {
  return getDb().prepare('SELECT * FROM users WHERE partner_code = ?').get(String(code).toUpperCase()) || null;
}

// ─── Users ───────────────────────────────────────────────

function upsertUser(data) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO users (telegram_id, name, phone, tariff, invited_by, is_ambassador,
                       subscription_status, subscription_start, subscription_end,
                       payment_method_id, ref_url, partner_code, watbot_contact_id, updated_at)
    VALUES (@telegram_id, @name, @phone, @tariff, @invited_by, @is_ambassador,
            @subscription_status, @subscription_start, @subscription_end,
            @payment_method_id, @ref_url, @partner_code, @watbot_contact_id, datetime('now'))
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
      partner_code = COALESCE(users.partner_code, @partner_code),
      watbot_contact_id = COALESCE(@watbot_contact_id, users.watbot_contact_id),
      updated_at = datetime('now')
  `);
  return stmt.run({
    telegram_id: String(data.telegram_id),
    name: data.name || null,
    phone: data.phone || null,
    tariff: data.tariff || null,
    invited_by: data.invited_by || null,
    is_ambassador: data.is_ambassador != null ? (data.is_ambassador ? 1 : 0) : null,
    subscription_status: data.subscription_status || null,
    subscription_start: data.subscription_start || null,
    subscription_end: data.subscription_end || null,
    payment_method_id: data.payment_method_id || null,
    ref_url: data.ref_url || null,
    partner_code: data.partner_code || null,
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

// ─── Реферальная комиссия 20% → SHC ─────────────────────

/**
 * Начисляет пригласившему 20% от суммы подписки реферала в SHC.
 * Вызывается из webhook при каждом успешном платеже.
 */
function processReferralSHC(referralTelegramId, subscriptionAmount) {
  const referral = getUser(referralTelegramId);
  if (!referral || !referral.invited_by) return null;

  const inviter = getUser(referral.invited_by);
  if (!inviter) return null;

  const shcAmount = Math.round(subscriptionAmount * 0.20);
  updateBalance(inviter.telegram_id, shcAmount);
  return { inviter_id: inviter.telegram_id, shc: shcAmount };
}

// ─── SHC бонусы за рефералов (обычные пользователи) ──────

const SHC_BASE = 50; // базовое начисление за каждого друга
const SHC_THRESHOLDS = {
  1:    50,
  3:    100,
  5:    290,
  10:   490,
  50:   1500,
  100:  5000,
  500:  10000,
  1000: 30000,
};

const SHC_ACHIEVEMENTS = {
  1:    'Ты привёл 1 друга — на счёт зачислено 50 SHC',
  3:    'Уже 3 друга в Sushi House — ты получаешь 100 SHC',
  5:    '5 приглашённых — на баланс падает 290 SHC',
  10:   '10 друзей с тобой — ты зарабатываешь 490 SHC',
  50:   'Мощный рейд: 50 приглашённых — +1500 SHC',
  100:  'Сотка друзей в боте — на счёт зачислено 5000 SHC',
  500:  'Ты собрал целый город: 500 друзей — +10000 SHC',
  1000: 'Топ-инвайтер Sushi House: 1000 друзей — +30000 SHC',
};

/**
 * Начисляет SHC пригласившему за нового реферала.
 * Вызывается из register-referral при установке invited_by.
 * @returns {object|null} результат начисления или null если нечего начислять
 */
function processReferralBonus(inviterTelegramId, referralTelegramId) {
  const db = getDb();

  const inviter = getUser(inviterTelegramId);
  if (!inviter) return null;

  // Проверяем, что бонус за этого реферала ещё не начислен
  const existing = db.prepare(
    'SELECT id FROM referral_bonuses WHERE user_id = ? AND referral_id = ?'
  ).get(String(inviterTelegramId), String(referralTelegramId));
  if (existing) return null;

  // Считаем текущее количество рефералов (включая нового)
  const referrals = getReferrals(inviterTelegramId);
  const friendsCount = referrals.length;

  // Базовый бонус
  let total = SHC_BASE;
  let thresholdBonus = 0;
  let achievement = `На счёт начислено ${SHC_BASE} SHC`;

  // Пороговый бонус
  if (SHC_THRESHOLDS[friendsCount]) {
    thresholdBonus = SHC_THRESHOLDS[friendsCount];
    total += thresholdBonus;
    achievement = SHC_ACHIEVEMENTS[friendsCount] || achievement;
  }

  // Записываем в транзакции и обновляем баланс
  const txn = db.transaction(() => {
    db.prepare(`
      INSERT INTO referral_bonuses (user_id, referral_id, base_amount, threshold_bonus, total_amount, friends_count, achievement)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(String(inviterTelegramId), String(referralTelegramId), SHC_BASE, thresholdBonus, total, friendsCount, achievement);

    updateBalance(inviterTelegramId, total);
  });
  txn();

  return {
    friends_count: friendsCount,
    base: SHC_BASE,
    threshold_bonus: thresholdBonus,
    total,
    achievement,
    new_balance: getUser(inviterTelegramId)?.balance_shc || 0,
  };
}

function getReferralBonuses(telegramId, limit = 50) {
  const db = getDb();
  return db.prepare(`
    SELECT rb.*, u.name as referral_name
    FROM referral_bonuses rb
    LEFT JOIN users u ON u.telegram_id = rb.referral_id
    WHERE rb.user_id = ?
    ORDER BY rb.created_at DESC
    LIMIT ?
  `).all(String(telegramId), limit);
}

// ─── Подписки: выборки по датам ─────────────────────────

/**
 * Подписки, истекающие через N дней (для напоминаний)
 */
function getExpiringSubscriptions(daysFromNow) {
  const db = getDb();
  const target = new Date();
  target.setDate(target.getDate() + daysFromNow);
  const targetStr = `${String(target.getDate()).padStart(2,'0')}.${String(target.getMonth()+1).padStart(2,'0')}.${target.getFullYear()}`;

  return db.prepare(`
    SELECT * FROM users
    WHERE subscription_status = 'активно'
      AND subscription_end = ?
  `).all(targetStr);
}

/**
 * Подписки, истёкшие на сегодня (subscription_end = сегодня)
 */
function getExpiredToday() {
  const db = getDb();
  const now = new Date();
  const todayStr = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`;

  return db.prepare(`
    SELECT * FROM users
    WHERE subscription_status = 'активно'
      AND subscription_end = ?
  `).all(todayStr);
}

/**
 * Отменить автопродление (payment_method_id = NULL, статус не меняем)
 */
function cancelAutoRenew(telegramId) {
  const db = getDb();
  db.prepare(`
    UPDATE users
    SET payment_method_id = NULL,
        updated_at = datetime('now')
    WHERE telegram_id = ?
  `).run(String(telegramId));
}

/**
 * Деактивировать подписку пользователя
 */
function deactivateSubscription(telegramId) {
  const db = getDb();
  db.prepare(`
    UPDATE users
    SET subscription_status = 'неактивно',
        payment_method_id = NULL,
        updated_at = datetime('now')
    WHERE telegram_id = ?
  `).run(String(telegramId));
}

/**
 * Продлить подписку после рекуррентного платежа
 */
function renewSubscription(telegramId, newEndDate) {
  const db = getDb();
  const now = new Date();
  const startStr = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`;

  db.prepare(`
    UPDATE users
    SET subscription_status = 'активно',
        subscription_start = ?,
        subscription_end = ?,
        updated_at = datetime('now')
    WHERE telegram_id = ?
  `).run(startStr, newEndDate, String(telegramId));
}

function getAllUsers() {
  return getDb().prepare('SELECT * FROM users ORDER BY updated_at DESC').all();
}

function getUserByPhone(phone) {
  return getDb().prepare('SELECT * FROM users WHERE phone = ?').get(phone) || null;
}

function getLastPayment(telegramId) {
  return getDb().prepare('SELECT * FROM payments WHERE telegram_id = ? ORDER BY created_at DESC LIMIT 1').get(String(telegramId)) || null;
}

function getAdminSubscribersList() {
  return getDb().prepare(`
    SELECT telegram_id, name, phone, tariff, is_ambassador,
           subscription_status, subscription_start, subscription_end,
           balance_shc, notes, created_at, updated_at
    FROM users
    WHERE tariff IS NOT NULL
    ORDER BY
      CASE tariff WHEN '9990' THEN 1 WHEN '1190' THEN 2 WHEN '490' THEN 3 WHEN '290' THEN 4 ELSE 5 END,
      updated_at DESC
  `).all();
}

function getAllUsersForStats() {
  return getDb().prepare('SELECT tariff, is_ambassador, subscription_status, subscription_end, created_at FROM users').all();
}

function getMonthRevenue(monthStart) {
  return getDb().prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status='succeeded' AND created_at >= ?"
  ).get(monthStart);
}

function extendSubscription(telegramId, days) {
  const user = getUser(telegramId);
  if (!user) throw new Error('user_not_found');

  const fmt = d => `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
  const today = new Date(); today.setHours(0,0,0,0);

  let base = today;
  if (user.subscription_end) {
    const [dd, mm, yyyy] = user.subscription_end.split('.');
    const end = new Date(`${yyyy}-${mm}-${dd}`);
    if (end > today) base = end;
  }

  const newEnd = new Date(base);
  newEnd.setDate(newEnd.getDate() + Number(days));

  getDb().prepare(`
    UPDATE users
    SET subscription_status = 'активно',
        subscription_start = COALESCE(subscription_start, ?),
        subscription_end = ?,
        updated_at = datetime('now')
    WHERE telegram_id = ?
  `).run(fmt(today), fmt(newEnd), String(telegramId));

  return getUser(telegramId);
}

function setUserNotes(telegramId, notes) {
  getDb().prepare(`UPDATE users SET notes = ?, updated_at = datetime('now') WHERE telegram_id = ?`)
    .run(notes || null, String(telegramId));
}

function setUserTariff(telegramId, tariff) {
  getDb().prepare(`
    UPDATE users SET tariff = ?, updated_at = datetime('now') WHERE telegram_id = ?
  `).run(tariff, String(telegramId));
  return getUser(telegramId);
}

function adminApplyUserTagAction(telegramId, action, tag) {
  const user = getUser(telegramId);
  if (!user) throw new Error('user_not_found');
  if (action !== 'add' && action !== 'remove') throw new Error('invalid_action');

  const TARIFF_TAGS = ['290', '490', '1190', '9990'];
  if (TARIFF_TAGS.includes(tag)) {
    return setUserTariff(telegramId, action === 'add' ? tag : null);
  }
  if (tag === 'амба') {
    getDb().prepare(
      `UPDATE users SET is_ambassador = ?, updated_at = datetime('now') WHERE telegram_id = ?`
    ).run(action === 'add' ? 1 : 0, String(telegramId));
    return getUser(telegramId);
  }
  throw new Error('invalid_tag');
}

// ─── Gift History ────────────────────────────────────────

function insertGiftHistory({ telegramId, giftType, claimedAt, claimedTs, windowNum, grantedBy, address, giftName }) {
  getDb().prepare(`
    INSERT INTO gift_history (telegram_id, gift_type, claimed_at, claimed_ts, window_num, granted_by, address, gift_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(String(telegramId), giftType, claimedAt, claimedTs, windowNum || null, grantedBy || 'user', address || null, giftName || null);
}

function getGiftHistory(telegramId) {
  return getDb().prepare(`
    SELECT id, gift_type, gift_name, claimed_at, claimed_ts, window_num, granted_by, address
    FROM gift_history
    WHERE telegram_id = ?
    ORDER BY claimed_ts DESC
    LIMIT 50
  `).all(String(telegramId));
}

function getGiftOrders(limit = 300) {
  return getDb().prepare(`
    SELECT gh.id, gh.telegram_id, gh.gift_type, gh.gift_name, gh.claimed_at, gh.claimed_ts,
           gh.window_num, gh.granted_by, gh.address,
           u.name, u.phone, u.tariff
    FROM gift_history gh
    LEFT JOIN users u ON gh.telegram_id = u.telegram_id
    ORDER BY gh.claimed_ts DESC
    LIMIT ?
  `).all(limit);
}

module.exports = {
  getDb,
  upsertUser,
  insertGiftHistory,
  getGiftHistory,
  getUser,
  getUserByContactId,
  getAllUsers,
  updateBalance,
  getReferrals,
  setInvitedBy,
  recordPayment,
  recordTransaction,
  getTransactions,
  getTotalEarnings,
  processCommissions,
  processReferralSHC,
  processReferralBonus,
  generatePartnerCode,
  getPartnerByCode,
  getReferralBonuses,
  getExpiringSubscriptions,
  getExpiredToday,
  cancelAutoRenew,
  deactivateSubscription,
  renewSubscription,
  setUserTariff,
  adminApplyUserTagAction,
  extendSubscription,
  setUserNotes,
  getUserByPhone,
  getLastPayment,
  getAdminSubscribersList,
  getAllUsersForStats,
  getMonthRevenue,
  getGiftOrders,
};
