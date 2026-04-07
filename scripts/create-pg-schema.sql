-- scripts/create-pg-schema.sql
-- Supabase (PostgreSQL) схема для miniapp-sushii
-- Запускать в Supabase SQL Editor:
-- https://qdmzkvjelmqszgioyryw.supabase.co/project/qdmzkvjelmqszgioyryw/sql/new
--
-- ВАЖНО: web_credentials уже существует — не трогаем.
-- Эта схема использует telegram_id TEXT как PRIMARY KEY (не UUID),
-- чтобы данные из SQLite мигрировали 1:1 без конвертации.

-- ─── 1. users ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  telegram_id        TEXT PRIMARY KEY,
  name               TEXT,
  phone              TEXT,
  tariff             TEXT,
  invited_by         TEXT REFERENCES users(telegram_id),
  balance_shc        NUMERIC DEFAULT 0,
  is_ambassador      BOOLEAN DEFAULT FALSE,
  subscription_status TEXT,
  subscription_start TEXT,   -- DD.MM.YYYY (как в SQLite)
  subscription_end   TEXT,   -- DD.MM.YYYY (как в SQLite)
  payment_method_id  TEXT,
  ref_url            TEXT,
  watbot_contact_id  TEXT,
  partner_code       TEXT,
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by);
CREATE INDEX IF NOT EXISTS idx_users_phone      ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_partner    ON users(partner_code);

-- ─── 2. payments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                   BIGSERIAL PRIMARY KEY,
  telegram_id          TEXT NOT NULL REFERENCES users(telegram_id),
  tariff               TEXT NOT NULL,
  amount               NUMERIC NOT NULL,
  months               INTEGER DEFAULT 1,
  yookassa_payment_id  TEXT,
  status               TEXT DEFAULT 'succeeded',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON payments(telegram_id);

-- ─── 3. transactions (комиссии амбассадоров) ─────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                  BIGSERIAL PRIMARY KEY,
  ambassador_id       TEXT NOT NULL REFERENCES users(telegram_id),
  referral_id         TEXT NOT NULL REFERENCES users(telegram_id),
  payment_id          BIGINT REFERENCES payments(id),
  payment_amount      NUMERIC NOT NULL,
  commission_amount   NUMERIC NOT NULL,
  commission_percent  NUMERIC NOT NULL,
  level               INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_ambassador ON transactions(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_transactions_referral   ON transactions(referral_id);

-- ─── 4. referral_bonuses (SHC бонусы) ────────────────────────
CREATE TABLE IF NOT EXISTS referral_bonuses (
  id              BIGSERIAL PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(telegram_id),
  referral_id     TEXT NOT NULL REFERENCES users(telegram_id),
  base_amount     NUMERIC NOT NULL DEFAULT 50,
  threshold_bonus NUMERIC DEFAULT 0,
  total_amount    NUMERIC NOT NULL,
  friends_count   INTEGER NOT NULL,
  achievement     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_bonuses_user ON referral_bonuses(user_id);

-- ─── 5. gift_history ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gift_history (
  id          BIGSERIAL PRIMARY KEY,
  telegram_id TEXT NOT NULL REFERENCES users(telegram_id),
  gift_type   TEXT NOT NULL,        -- 'roll' | 'set'
  claimed_at  TEXT NOT NULL,        -- DD.MM.YYYY
  claimed_ts  TEXT NOT NULL,        -- ISO timestamp
  window_num  INTEGER,
  granted_by  TEXT DEFAULT 'user',  -- 'user' | 'admin'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_history_telegram ON gift_history(telegram_id);

-- ─── web_credentials уже существует, пропускаем ─────────────
-- CREATE TABLE IF NOT EXISTS web_credentials (
--   phone         TEXT PRIMARY KEY,
--   password_hash TEXT NOT NULL,
--   created_at    TIMESTAMPTZ DEFAULT now(),
--   updated_at    TIMESTAMPTZ DEFAULT now()
-- );
