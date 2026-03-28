-- ============================================
-- SUPABASE MIGRATION — Sushi House 39
-- ============================================
-- Выполните этот SQL в Supabase SQL Editor:
-- https://qdmzkvjelmqszgioyryw.supabase.co/project/qdmzkvjelmqszgioyryw/sql/new

-- ============================================
-- 1. ТАБЛИЦА: users (пользователи)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  name TEXT,
  phone TEXT,
  tariff TEXT,
  invited_by UUID REFERENCES users(id),
  balance_shc REAL DEFAULT 0,
  is_ambassador BOOLEAN DEFAULT FALSE,
  subscription_status TEXT,
  subscription_start TEXT,
  subscription_end TEXT,
  payment_method_id TEXT,
  ref_url TEXT,
  watbot_contact_id TEXT,
  referral_code TEXT UNIQUE,
  auth_method TEXT DEFAULT 'telegram',
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- ============================================
-- 2. ТАБЛИЦА: payments (платежи)
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  telegram_id TEXT,
  tariff TEXT NOT NULL,
  amount REAL NOT NULL,
  months INTEGER DEFAULT 1,
  yookassa_payment_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON payments(telegram_id);
CREATE INDEX IF NOT EXISTS idx_payments_yookassa_id ON payments(yookassa_payment_id);

-- ============================================
-- 3. ТАБЛИЦА: transactions (комиссии амбассадоров)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  payment_amount REAL NOT NULL,
  commission_amount REAL NOT NULL,
  commission_percent REAL NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_ambassador ON transactions(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_transactions_referral ON transactions(referral_id);

-- ============================================
-- 4. ТАБЛИЦА: referral_bonuses (бонусы за рефералов)
-- ============================================
CREATE TABLE IF NOT EXISTS referral_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES users(id) ON DELETE CASCADE,
  base_amount REAL NOT NULL DEFAULT 50,
  threshold_bonus REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  friends_count INTEGER NOT NULL,
  achievement TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_bonuses_user ON referral_bonuses(user_id);

-- ============================================
-- 5. ТАБЛИЦА: gift_windows (окна подарков)
-- ============================================
CREATE TABLE IF NOT EXISTS gift_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  window_num INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting',
  claimed_at TIMESTAMP WITH TIME ZONE,
  available_from TIMESTAMP WITH TIME ZONE,
  available_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, window_num)
);

CREATE INDEX IF NOT EXISTS idx_gift_windows_user ON gift_windows(user_id);

-- ============================================
-- 6. RLS (Row Level Security) — политики доступа
-- ============================================

-- Включаем RLS для всех таблиц
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_windows ENABLE ROW LEVEL SECURITY;

-- Пользователи могут читать только свои данные
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (
    auth.uid()::TEXT = telegram_id OR
    auth.email() = email OR
    current_setting('request.jwt.claims', true)::json->>'userId' = telegram_id
  );

-- Пользователи могут обновлять только свои данные
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (
    auth.uid()::TEXT = telegram_id OR
    auth.email() = email OR
    current_setting('request.jwt.claims', true)::json->>'userId' = telegram_id
  );

-- Пользователи могут вставлять свои данные
CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  WITH CHECK (
    auth.uid()::TEXT = telegram_id OR
    auth.email() = email OR
    current_setting('request.jwt.claims', true)::json->>'userId' = telegram_id
  );

-- Payments — только чтение своих данных
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (
    auth.uid()::TEXT = user_id::TEXT OR
    current_setting('request.jwt.claims', true)::json->>'userId' = telegram_id
  );

-- Transactions — только чтение своих данных
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (
    auth.uid()::TEXT = ambassador_id::TEXT OR
    current_setting('request.jwt.claims', true)::json->>'userId' = ambassador_id
  );

-- Referral bonuses — только чтение своих данных
CREATE POLICY "Users can view own bonuses"
  ON referral_bonuses FOR SELECT
  USING (
    auth.uid()::TEXT = user_id::TEXT OR
    current_setting('request.jwt.claims', true)::json->>'userId' = user_id
  );

-- Gift windows — только чтение своих данных
CREATE POLICY "Users can view own gift windows"
  ON gift_windows FOR SELECT
  USING (
    auth.uid()::TEXT = user_id::TEXT OR
    current_setting('request.jwt.claims', true)::json->>'userId' = user_id
  );

-- ============================================
-- 7. FUNCTIONS (хранимые функции)
-- ============================================

-- Функция для получения количества рефералов
CREATE OR REPLACE FUNCTION get_referrals_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM users WHERE invited_by = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения баланса амбассадора
CREATE OR REPLACE FUNCTION get_ambassador_balance(user_uuid UUID)
RETURNS REAL AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(commission_amount), 0)
    FROM transactions
    WHERE ambassador_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения количества амбассадоров в команде
CREATE OR REPLACE FUNCTION get_ambassadors_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM users 
    WHERE invited_by = user_uuid AND is_ambassador = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. TRIGGERS (автоматические триггеры)
-- ============================================

-- Автоматическое обновление updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. EXTENSIONS (расширения PostgreSQL)
-- ============================================

-- UUID генерация
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 10. COMMENTS (комментарии к таблицам)
-- ============================================

COMMENT ON TABLE users IS 'Пользователи (Telegram + Web)';
COMMENT ON TABLE payments IS 'Платежи и подписки';
COMMENT ON TABLE transactions IS 'Комиссии амбассадоров';
COMMENT ON TABLE referral_bonuses IS 'Бонусы за приглашённых рефералов';
COMMENT ON TABLE gift_windows IS 'Окна для получения подарков по подписке';

-- ============================================
-- ГОТОВО!
-- ============================================
-- После выполнения SQL:
-- 1. Проверьте, что все таблицы созданы
-- 2. Проверьте, что RLS политики активны
-- 3. Протестируйте подключение через API
