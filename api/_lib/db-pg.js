// api/_lib/db-pg.js — PostgreSQL (Supabase) аналог db.js
// Async-версия с идентичными именами экспортов.
// НЕ подключается к db.js — самостоятельный модуль.
// Используется только при финальном переключении (USE_SUPABASE=true).
//
// Требует: DATABASE_URL в .env и пакет pg (npm install pg)
// Схема: scripts/create-pg-schema.sql

const { Pool } = require('pg');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

// Runtime-миграции: добавить колонки если нет (идемпотентно)
let _migrationsDone = false;
async function ensureMigrations() {
  if (_migrationsDone) return;
  _migrationsDone = true;
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name TEXT');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS game_wins_today INTEGER DEFAULT 0');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS game_day TEXT');

    // Таблицы для игры «Пятибуквенное слово»
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_word_dictionary (
        id   SERIAL PRIMARY KEY,
        word TEXT NOT NULL UNIQUE
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_daily_word (
        date    TEXT PRIMARY KEY,
        word_id INTEGER NOT NULL REFERENCES game_word_dictionary(id)
      )
    `);

    // Seed при пустой таблице
    const { rows: cnt } = await pool.query('SELECT COUNT(*) as c FROM game_word_dictionary');
    if (parseInt(cnt[0].c) === 0) {
      try {
        const words = require('../game-words.json');
        const client2 = await pool.connect();
        try {
          await client2.query('BEGIN');
          for (const w of words) {
            await client2.query('INSERT INTO game_word_dictionary (word) VALUES ($1) ON CONFLICT DO NOTHING', [String(w).toLowerCase()]);
          }
          await client2.query('COMMIT');
          console.log(`[db-pg] Seeded ${words.length} game words`);
        } catch (e) { await client2.query('ROLLBACK'); throw e; }
        finally { client2.release(); }
      } catch (e) {
        console.warn('[db-pg] game-words.json not found:', e.message);
      }
    }
  } catch (err) {
    console.error('[db-pg] migration error:', err.message);
  }
}
ensureMigrations();

// ─── Helpers ─────────────────────────────────────────────────

/** Форматирует Date → DD.MM.YYYY (совместимо с SQLite-форматом) */
const fmt = d => `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;

async function query(sql, params) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ─── Совместимость с getDb() ──────────────────────────────────
// Некоторые файлы вызывают getDb() напрямую.
// Возвращаем объект с методом query для минимальной совместимости.
function getDb() {
  return { pool, query: (sql, p) => query(sql, p) };
}

// ─── Partner codes ────────────────────────────────────────────

function generatePartnerCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function getPartnerByCode(code) {
  const res = await query('SELECT * FROM users WHERE partner_code = $1', [String(code).toUpperCase()]);
  return res.rows[0] || null;
}

// ─── Users ───────────────────────────────────────────────────

async function upsertUser(data) {
  const tid = String(data.telegram_id);
  await query(`
    INSERT INTO users (
      telegram_id, name, phone, tariff, invited_by, is_ambassador,
      subscription_status, subscription_start, subscription_end,
      payment_method_id, ref_url, partner_code, watbot_contact_id, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, NOW())
    ON CONFLICT (telegram_id) DO UPDATE SET
      name               = COALESCE($2, users.name),
      phone              = COALESCE($3, users.phone),
      tariff             = COALESCE($4, users.tariff),
      invited_by         = COALESCE(users.invited_by, $5),
      is_ambassador      = COALESCE($6, users.is_ambassador),
      subscription_status = COALESCE($7, users.subscription_status),
      subscription_start = COALESCE($8, users.subscription_start),
      subscription_end   = COALESCE($9, users.subscription_end),
      payment_method_id  = COALESCE($10, users.payment_method_id),
      ref_url            = COALESCE($11, users.ref_url),
      partner_code       = COALESCE(users.partner_code, $12),
      watbot_contact_id  = COALESCE($13, users.watbot_contact_id),
      updated_at         = NOW()
  `, [
    tid,
    data.name || null,
    data.phone || null,
    data.tariff || null,
    data.invited_by || null,
    data.is_ambassador != null ? !!data.is_ambassador : null,
    data.subscription_status || null,
    data.subscription_start || null,
    data.subscription_end || null,
    data.payment_method_id || null,
    data.ref_url || null,
    data.partner_code || null,
    data.watbot_contact_id || null,
  ]);
}

async function getUser(telegramId) {
  const res = await query('SELECT * FROM users WHERE telegram_id = $1', [String(telegramId)]);
  return res.rows[0] || null;
}

async function getUserByContactId(contactId) {
  const res = await query('SELECT * FROM users WHERE watbot_contact_id = $1', [String(contactId)]);
  return res.rows[0] || null;
}

async function getAllUsers() {
  const res = await query('SELECT * FROM users ORDER BY updated_at DESC');
  return res.rows;
}

async function updateBalance(telegramId, amount, client) {
  const q = client
    ? (sql, p) => client.query(sql, p)
    : (sql, p) => query(sql, p);
  await q(
    'UPDATE users SET balance_shc = balance_shc + $1, updated_at = NOW() WHERE telegram_id = $2',
    [amount, String(telegramId)]
  );
}

async function getReferrals(telegramId) {
  const res = await query(
    'SELECT telegram_id, name, phone, tariff, is_ambassador, created_at FROM users WHERE invited_by = $1 ORDER BY created_at DESC',
    [String(telegramId)]
  );
  return res.rows;
}

async function setInvitedBy(telegramId, ambassadorId) {
  await query(
    'UPDATE users SET invited_by = $1, updated_at = NOW() WHERE telegram_id = $2 AND invited_by IS NULL',
    [String(ambassadorId), String(telegramId)]
  );
}

// ─── Payments ────────────────────────────────────────────────

async function recordPayment(data) {
  const res = await query(`
    INSERT INTO payments (telegram_id, tariff, amount, months, yookassa_payment_id, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `, [
    String(data.telegram_id),
    String(data.tariff),
    Number(data.amount),
    Number(data.months) || 1,
    data.yookassa_payment_id || null,
    data.status || 'succeeded',
  ]);
  return res.rows[0].id;
}

// ─── Transactions ────────────────────────────────────────────

async function recordTransaction(data, client) {
  const q = client
    ? (sql, p) => client.query(sql, p)
    : (sql, p) => query(sql, p);
  return q(`
    INSERT INTO transactions (ambassador_id, referral_id, payment_id, payment_amount, commission_amount, commission_percent, level)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    String(data.ambassador_id),
    String(data.referral_id),
    data.payment_id || null,
    Number(data.payment_amount),
    Number(data.commission_amount),
    Number(data.commission_percent),
    Number(data.level) || 1,
  ]);
}

async function getTransactions(ambassadorId, limit = 50) {
  const res = await query(`
    SELECT t.*, u.name as referral_name
    FROM transactions t
    LEFT JOIN users u ON u.telegram_id = t.referral_id
    WHERE t.ambassador_id = $1
    ORDER BY t.created_at DESC
    LIMIT $2
  `, [String(ambassadorId), limit]);
  return res.rows;
}

async function getTotalEarnings(ambassadorId) {
  const res = await query(`
    SELECT
      COALESCE(SUM(commission_amount), 0)                                          AS total,
      COALESCE(SUM(CASE WHEN level = 1 THEN commission_amount ELSE 0 END), 0)     AS level1,
      COALESCE(SUM(CASE WHEN level = 2 THEN commission_amount ELSE 0 END), 0)     AS level2
    FROM transactions WHERE ambassador_id = $1
  `, [String(ambassadorId)]);
  return res.rows[0];
}

// ─── Комиссии при оплате ─────────────────────────────────────

async function processCommissions(referralTelegramId, paymentAmount, paymentId) {
  const results = [];

  const referral = await getUser(referralTelegramId);
  if (!referral || !referral.invited_by) return results;

  const ambassador = await getUser(referral.invited_by);
  if (!ambassador || !ambassador.is_ambassador) return results;

  const commission1 = Math.round(paymentAmount * 0.30 * 100) / 100;

  await withTransaction(async (client) => {
    await recordTransaction({
      ambassador_id: ambassador.telegram_id,
      referral_id: referralTelegramId,
      payment_id: paymentId,
      payment_amount: paymentAmount,
      commission_amount: commission1,
      commission_percent: 30,
      level: 1,
    }, client);
    await updateBalance(ambassador.telegram_id, commission1, client);
    results.push({ level: 1, ambassador: ambassador.telegram_id, amount: commission1 });

    if (ambassador.invited_by) {
      const grandAmbassador = await getUser(ambassador.invited_by);
      if (grandAmbassador && grandAmbassador.is_ambassador) {
        const ambReferrals = await getReferrals(grandAmbassador.telegram_id);
        const ambCount = ambReferrals.filter(r => r.is_ambassador).length;
        if (ambCount >= 10) {
          const commission2 = Math.round(paymentAmount * 0.05 * 100) / 100;
          await recordTransaction({
            ambassador_id: grandAmbassador.telegram_id,
            referral_id: referralTelegramId,
            payment_id: paymentId,
            payment_amount: paymentAmount,
            commission_amount: commission2,
            commission_percent: 5,
            level: 2,
          }, client);
          await updateBalance(grandAmbassador.telegram_id, commission2, client);
          results.push({ level: 2, ambassador: grandAmbassador.telegram_id, amount: commission2 });
        }
      }
    }
  });

  return results;
}

async function processReferralSHC(referralTelegramId, subscriptionAmount) {
  const referral = await getUser(referralTelegramId);
  if (!referral || !referral.invited_by) return null;

  const inviter = await getUser(referral.invited_by);
  if (!inviter) return null;

  const shcAmount = Math.round(subscriptionAmount * 0.20);

  await withTransaction(async (client) => {
    await client.query(`
      INSERT INTO referral_bonuses
        (user_id, referral_id, base_amount, threshold_bonus, total_amount, friends_count, achievement)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      String(inviter.telegram_id), String(referralTelegramId),
      shcAmount, 0, shcAmount, 0,
      `20% от подписки ${subscriptionAmount}₽`,
    ]);
    await updateBalance(inviter.telegram_id, shcAmount, client);
  });

  return { inviter_id: inviter.telegram_id, shc: shcAmount };
}

// ─── SHC бонусы за рефералов ─────────────────────────────────

const SHC_BASE = 50;
const SHC_THRESHOLDS = { 1: 50, 3: 100, 5: 290, 10: 490, 50: 1500, 100: 5000, 500: 10000, 1000: 30000 };
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

async function processReferralBonus(inviterTelegramId, referralTelegramId) {
  const inviter = await getUser(inviterTelegramId);
  if (!inviter) return null;

  // friends_count > 0 — признак join-бонуса (subscription-бонусы пишутся с friends_count = 0)
  const existing = await query(
    'SELECT id FROM referral_bonuses WHERE user_id = $1 AND referral_id = $2 AND friends_count > 0',
    [String(inviterTelegramId), String(referralTelegramId)]
  );
  if (existing.rows.length > 0) return null;

  const referrals = await getReferrals(inviterTelegramId);
  const friendsCount = referrals.length;

  let total = SHC_BASE;
  let thresholdBonus = 0;
  let achievement = `На счёт начислено ${SHC_BASE} SHC`;

  if (SHC_THRESHOLDS[friendsCount]) {
    thresholdBonus = SHC_THRESHOLDS[friendsCount];
    total += thresholdBonus;
    achievement = SHC_ACHIEVEMENTS[friendsCount] || achievement;
  }

  await withTransaction(async (client) => {
    await client.query(`
      INSERT INTO referral_bonuses (user_id, referral_id, base_amount, threshold_bonus, total_amount, friends_count, achievement)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [String(inviterTelegramId), String(referralTelegramId), SHC_BASE, thresholdBonus, total, friendsCount, achievement]);
    await updateBalance(inviterTelegramId, total, client);
  });

  const updatedInviter = await getUser(inviterTelegramId);
  return {
    friends_count: friendsCount,
    base: SHC_BASE,
    threshold_bonus: thresholdBonus,
    total,
    achievement,
    new_balance: Number(updatedInviter?.balance_shc) || 0,
  };
}

async function getReferralBonuses(telegramId, limit = 50) {
  const res = await query(`
    SELECT rb.*, u.name as referral_name
    FROM referral_bonuses rb
    LEFT JOIN users u ON u.telegram_id = rb.referral_id
    WHERE rb.user_id = $1
    ORDER BY rb.created_at DESC
    LIMIT $2
  `, [String(telegramId), limit]);
  return res.rows;
}

// ─── Подписки ────────────────────────────────────────────────

async function getExpiringSubscriptions(daysFromNow) {
  const target = new Date();
  target.setDate(target.getDate() + daysFromNow);
  const targetStr = fmt(target);
  const res = await query(
    "SELECT * FROM users WHERE subscription_status = 'активно' AND subscription_end = $1",
    [targetStr]
  );
  return res.rows;
}

async function getExpiredToday() {
  const todayStr = fmt(new Date());
  const res = await query(
    "SELECT * FROM users WHERE subscription_status = 'активно' AND subscription_end = $1",
    [todayStr]
  );
  return res.rows;
}

async function cancelAutoRenew(telegramId) {
  await query(
    'UPDATE users SET payment_method_id = NULL, updated_at = NOW() WHERE telegram_id = $1',
    [String(telegramId)]
  );
}

async function deactivateSubscription(telegramId) {
  await query(
    "UPDATE users SET subscription_status = 'неактивно', payment_method_id = NULL, updated_at = NOW() WHERE telegram_id = $1",
    [String(telegramId)]
  );
}

async function renewSubscription(telegramId, newEndDate) {
  const startStr = fmt(new Date());
  await query(`
    UPDATE users
    SET subscription_status = 'активно', subscription_start = $1, subscription_end = $2, updated_at = NOW()
    WHERE telegram_id = $3
  `, [startStr, newEndDate, String(telegramId)]);
}

async function extendSubscription(telegramId, days) {
  const user = await getUser(telegramId);
  if (!user) throw new Error('user_not_found');

  const today = new Date(); today.setHours(0,0,0,0);
  let base = today;
  if (user.subscription_end) {
    const [dd, mm, yyyy] = user.subscription_end.split('.');
    const end = new Date(`${yyyy}-${mm}-${dd}`);
    if (end > today) base = end;
  }

  const newEnd = new Date(base);
  newEnd.setDate(newEnd.getDate() + Number(days));

  await query(`
    UPDATE users
    SET subscription_status = 'активно',
        subscription_start = COALESCE(subscription_start, $1),
        subscription_end = $2,
        updated_at = NOW()
    WHERE telegram_id = $3
  `, [fmt(today), fmt(newEnd), String(telegramId)]);

  return await getUser(telegramId);
}

async function setUserNotes(telegramId, notes) {
  await query(
    'UPDATE users SET notes = $1, updated_at = NOW() WHERE telegram_id = $2',
    [notes || null, String(telegramId)]
  );
}

async function updateLastAddress(telegramId, lastAddress, lastPickupPoint) {
  await query(
    'UPDATE users SET last_address = $1, last_pickup_point = $2, updated_at = NOW() WHERE telegram_id = $3',
    [lastAddress || null, lastPickupPoint || null, String(telegramId)]
  );
}

async function updateUserProfile(telegramId, data) {
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
  await query(`
    UPDATE users
    SET first_name = $1,
        last_name = $2,
        middle_name = $3,
        phone = $4,
        name = $5,
        updated_at = NOW()
    WHERE telegram_id = $6
  `, [
    data.first_name || null,
    data.last_name || null,
    data.middle_name || null,
    data.phone || null,
    fullName,
    String(telegramId),
  ]);
  return await getUser(telegramId);
}

async function findUserByPhoneExceptId(phone, telegramId) {
  const res = await query(
    'SELECT telegram_id, name FROM users WHERE phone = $1 AND telegram_id != $2 LIMIT 1',
    [phone, String(telegramId)]
  );
  return res.rows[0] || null;
}

async function setUserTariff(telegramId, tariff) {
  await query(
    'UPDATE users SET tariff = $1, updated_at = NOW() WHERE telegram_id = $2',
    [tariff, String(telegramId)]
  );
  return await getUser(telegramId);
}

async function adminApplyUserTagAction(telegramId, action, tag) {
  const user = await getUser(telegramId);
  if (!user) throw new Error('user_not_found');
  if (action !== 'add' && action !== 'remove') throw new Error('invalid_action');

  const TARIFF_TAGS = ['290', '490', '1190', '9990'];
  if (TARIFF_TAGS.includes(tag)) {
    return await setUserTariff(telegramId, action === 'add' ? tag : null);
  }
  if (tag === 'амба') {
    await query(
      'UPDATE users SET is_ambassador = $1, updated_at = NOW() WHERE telegram_id = $2',
      [action === 'add', String(telegramId)]
    );
    return await getUser(telegramId);
  }
  throw new Error('invalid_tag');
}

// ─── Orders ──────────────────────────────────────────────────

async function insertOrder({ telegramId, frontpadOrderId, frontpadOrderNumber, orderType, deliveryType, address, productsJson, totalPrice, clientName }) {
  await query(`
    INSERT INTO orders (telegram_id, frontpad_order_id, frontpad_order_number, order_type, delivery_type, address, products_json, total_price, client_name)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    String(telegramId),
    frontpadOrderId || null,
    frontpadOrderNumber || null,
    orderType || 'discount',
    deliveryType || 'pickup',
    address || null,
    productsJson || null,
    totalPrice || 0,
    clientName || null,
  ]);
}

async function getOrderHistory(telegramId, limit = 50) {
  const res = await query(`
    SELECT id, order_type, delivery_type, address, products_json, total_price,
           client_name, frontpad_order_number, created_at
    FROM orders
    WHERE telegram_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [String(telegramId), limit]);
  return res.rows;
}

async function getAdminOrders(limit = 500) {
  const res = await query(`
    SELECT o.id, o.telegram_id, o.order_type, o.delivery_type, o.address,
           o.products_json, o.total_price, o.client_name, o.created_at,
           o.frontpad_order_number,
           u.name as user_name, u.phone as user_phone, u.tariff
    FROM orders o
    LEFT JOIN users u ON o.telegram_id = u.telegram_id
    ORDER BY o.created_at DESC
    LIMIT $1
  `, [limit]);
  return res.rows;
}

// ─── Gift History ────────────────────────────────────────────

async function insertGiftHistory({ telegramId, giftType, claimedAt, claimedTs, windowNum, grantedBy, address, giftName }) {
  await query(`
    INSERT INTO gift_history (telegram_id, gift_type, claimed_at, claimed_ts, window_num, granted_by, address, gift_name)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [String(telegramId), giftType, claimedAt, claimedTs, windowNum || null, grantedBy || 'user', address || null, giftName || null]);
}

async function getGiftHistory(telegramId) {
  const res = await query(`
    SELECT id, gift_type, gift_name, claimed_at, claimed_ts, window_num, granted_by, address
    FROM gift_history WHERE telegram_id = $1
    ORDER BY claimed_ts DESC LIMIT 50
  `, [String(telegramId)]);
  return res.rows;
}

async function getGiftOrders(limit = 300) {
  const res = await query(`
    SELECT gh.id, gh.telegram_id, gh.gift_type, gh.gift_name, gh.claimed_at, gh.claimed_ts,
           gh.window_num, gh.granted_by, gh.address,
           u.name, u.phone, u.tariff
    FROM gift_history gh
    LEFT JOIN users u ON gh.telegram_id = u.telegram_id
    ORDER BY gh.claimed_ts DESC
    LIMIT $1
  `, [limit]);
  return res.rows;
}

// ─── Дополнительные функции для API ──────────────────────────

async function getUserByPhone(phone) {
  const res = await query('SELECT * FROM users WHERE phone = $1', [phone]);
  return res.rows[0] || null;
}

async function getLastPayment(telegramId) {
  const res = await query(
    'SELECT * FROM payments WHERE telegram_id = $1 ORDER BY created_at DESC LIMIT 1',
    [String(telegramId)]
  );
  return res.rows[0] || null;
}

async function getAdminSubscribersList() {
  const res = await query(`
    SELECT u.telegram_id, u.name, u.phone, u.tariff, u.is_ambassador,
           u.subscription_status, u.subscription_start, u.subscription_end,
           u.balance_shc, u.notes, u.created_at, u.updated_at,
           u.invited_by,
           inv.name AS invited_by_name,
           (SELECT COUNT(*) FROM users r WHERE r.invited_by = u.telegram_id) AS referrals_count,
           COALESCE((SELECT SUM(rb.total_amount) FROM referral_bonuses rb WHERE rb.user_id = u.telegram_id), 0) AS shc_earned
    FROM users u
    LEFT JOIN users inv ON inv.telegram_id = u.invited_by
    WHERE u.tariff IS NOT NULL
    ORDER BY
      CASE u.tariff WHEN '9990' THEN 1 WHEN '1190' THEN 2 WHEN '490' THEN 3 WHEN '290' THEN 4 ELSE 5 END,
      u.updated_at DESC
  `);
  return res.rows;
}

async function getAllUsersForStats() {
  const res = await query(
    'SELECT tariff, is_ambassador, subscription_status, subscription_end, created_at FROM users'
  );
  return res.rows;
}

async function getMonthRevenue(monthStart) {
  const res = await query(
    "SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status='succeeded' AND created_at >= $1",
    [monthStart]
  );
  return res.rows[0];
}

async function getAdminTopReferrers(limit = 20) {
  const res = await query(`
    SELECT u.telegram_id, u.name, u.phone, u.tariff, u.balance_shc,
           (SELECT COUNT(*) FROM users r WHERE r.invited_by = u.telegram_id) AS referrals_count,
           COALESCE((SELECT SUM(rb.total_amount) FROM referral_bonuses rb WHERE rb.user_id = u.telegram_id), 0) AS shc_earned
    FROM users u
    WHERE (SELECT COUNT(*) FROM users r WHERE r.invited_by = u.telegram_id) > 0
    ORDER BY referrals_count DESC
    LIMIT $1
  `, [limit]);
  return res.rows;
}

async function getAdminRecentBonuses(limit = 50) {
  const res = await query(`
    SELECT rb.id, rb.user_id, rb.referral_id, rb.total_amount, rb.friends_count, rb.achievement, rb.created_at,
           u.name AS user_name,
           ref.name AS referral_name
    FROM referral_bonuses rb
    LEFT JOIN users u ON u.telegram_id = rb.user_id
    LEFT JOIN users ref ON ref.telegram_id = rb.referral_id
    ORDER BY rb.created_at DESC
    LIMIT $1
  `, [limit]);
  return res.rows;
}

// ─── Game: Пятибуквенное слово ───────────────────────────────

async function getGameDailyWord(gameDay) {
  const { rows } = await query(`
    SELECT gd.date, gw.word
    FROM game_daily_word gd
    JOIN game_word_dictionary gw ON gw.id = gd.word_id
    WHERE gd.date = $1
  `, [gameDay]);
  if (rows[0]) return rows[0];

  // Случайное слово, которое не использовалось последние 30 дней
  const { rows: rand } = await query(`
    SELECT id, word FROM game_word_dictionary
    WHERE id NOT IN (SELECT word_id FROM game_daily_word ORDER BY date DESC LIMIT 30)
    ORDER BY RANDOM() LIMIT 1
  `);
  const chosen = rand[0] || (await query('SELECT id, word FROM game_word_dictionary ORDER BY RANDOM() LIMIT 1')).rows[0];
  if (!chosen) return null;

  await query('INSERT INTO game_daily_word (date, word_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [gameDay, chosen.id]);
  return { date: gameDay, word: chosen.word };
}

async function getGameStats(telegramId, gameDay) {
  const { rows } = await query('SELECT game_wins_today, game_day FROM users WHERE telegram_id = $1', [String(telegramId)]);
  if (!rows[0]) return { winsToday: 0, gameDay };
  if (rows[0].game_day !== gameDay) return { winsToday: 0, gameDay };
  return { winsToday: rows[0].game_wins_today || 0, gameDay };
}

async function recordGameWin(telegramId, gameDay) {
  const { rows } = await query('SELECT game_wins_today, game_day FROM users WHERE telegram_id = $1', [String(telegramId)]);
  if (!rows[0]) return 0;

  const currentDay = rows[0].game_day;
  const currentWins = currentDay === gameDay ? (rows[0].game_wins_today || 0) : 0;
  if (currentWins >= 3) return currentWins;

  const newWins = currentWins + 1;
  await query(`
    UPDATE users SET game_wins_today = $1, game_day = $2, updated_at = NOW()
    WHERE telegram_id = $3
  `, [newWins, gameDay, String(telegramId)]);

  await updateBalance(telegramId, 3);
  return newWins;
}

async function getGameWordExists(word) {
  const { rows } = await query('SELECT 1 FROM game_word_dictionary WHERE word = $1', [word]);
  return rows.length > 0;
}

// ─── Экспорт (совместим с db.js) ─────────────────────────────

module.exports = {
  getDb,
  pool,
  query,
  upsertUser,
  insertOrder,
  getOrderHistory,
  getAdminOrders,
  insertGiftHistory,
  getGiftHistory,
  getGiftOrders,
  getUser,
  getUserByContactId,
  getUserByPhone,
  getAllUsers,
  getAllUsersForStats,
  updateBalance,
  getReferrals,
  setInvitedBy,
  recordPayment,
  getLastPayment,
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
  updateLastAddress,
  updateUserProfile,
  findUserByPhoneExceptId,
  getAdminSubscribersList,
  getMonthRevenue,
  getAdminTopReferrers,
  getAdminRecentBonuses,
  getGameDailyWord,
  getGameStats,
  recordGameWin,
  getGameWordExists,
};
