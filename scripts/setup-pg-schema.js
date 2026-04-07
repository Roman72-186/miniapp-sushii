// scripts/setup-pg-schema.js — создание схемы в новом PostgreSQL проекте
// Запуск: DATABASE_URL=... node scripts/setup-pg-schema.js

require('dotenv').config();
const { Pool } = require('pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres.lfsqjmsjldisqycyvdnw:6HVAmGwsW2yYfCVD@aws-1-eu-north-1.pooler.supabase.com:5432/postgres';
const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    telegram_id        TEXT PRIMARY KEY,
    name               TEXT,
    phone              TEXT,
    tariff             TEXT,
    invited_by         TEXT REFERENCES users(telegram_id),
    balance_shc        NUMERIC DEFAULT 0,
    is_ambassador      BOOLEAN DEFAULT FALSE,
    subscription_status TEXT,
    subscription_start TEXT,
    subscription_end   TEXT,
    payment_method_id  TEXT,
    ref_url            TEXT,
    watbot_contact_id  TEXT,
    partner_code       TEXT,
    notes              TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id                   BIGSERIAL PRIMARY KEY,
    telegram_id          TEXT NOT NULL REFERENCES users(telegram_id),
    tariff               TEXT NOT NULL,
    amount               NUMERIC NOT NULL,
    months               INTEGER DEFAULT 1,
    yookassa_payment_id  TEXT,
    status               TEXT DEFAULT 'succeeded',
    created_at           TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id                  BIGSERIAL PRIMARY KEY,
    ambassador_id       TEXT NOT NULL REFERENCES users(telegram_id),
    referral_id         TEXT NOT NULL REFERENCES users(telegram_id),
    payment_id          BIGINT REFERENCES payments(id),
    payment_amount      NUMERIC NOT NULL,
    commission_amount   NUMERIC NOT NULL,
    commission_percent  NUMERIC NOT NULL,
    level               INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS referral_bonuses (
    id              BIGSERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(telegram_id),
    referral_id     TEXT NOT NULL REFERENCES users(telegram_id),
    base_amount     NUMERIC NOT NULL DEFAULT 50,
    threshold_bonus NUMERIC DEFAULT 0,
    total_amount    NUMERIC NOT NULL,
    friends_count   INTEGER NOT NULL,
    achievement     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS gift_history (
    id          BIGSERIAL PRIMARY KEY,
    telegram_id TEXT NOT NULL REFERENCES users(telegram_id),
    gift_type   TEXT NOT NULL,
    claimed_at  TEXT NOT NULL,
    claimed_ts  TEXT NOT NULL,
    window_num  INTEGER,
    granted_by  TEXT DEFAULT 'user',
    created_at  TIMESTAMPTZ DEFAULT NOW()
  )`,
];

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by)`,
  `CREATE INDEX IF NOT EXISTS idx_users_phone      ON users(phone)`,
  `CREATE INDEX IF NOT EXISTS idx_users_partner    ON users(partner_code)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_tid     ON payments(telegram_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tx_ambassador    ON transactions(ambassador_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tx_referral      ON transactions(referral_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rb_user          ON referral_bonuses(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_gh_telegram      ON gift_history(telegram_id)`,
];

async function main() {
  const client = await pool.connect();
  console.log('=== Создание схемы PostgreSQL ===\n');
  try {
    for (const sql of TABLES) {
      const name = sql.match(/TABLE IF NOT EXISTS (\w+)/)[1];
      try { await client.query(sql); console.log('✅ таблица:', name); }
      catch (e) { console.log('⚠️ ', name, ':', e.message.substring(0, 60)); }
    }
    for (const sql of INDEXES) {
      try { await client.query(sql); }
      catch (e) { console.log('⚠️ index:', e.message.substring(0, 60)); }
    }
    // Проверка
    const res = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log('\nТаблицы в БД:', res.rows.map(r => r.table_name).join(', '));
    console.log('\n✅ Схема готова!');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
