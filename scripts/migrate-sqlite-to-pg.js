#!/usr/bin/env node
// scripts/migrate-sqlite-to-pg.js
// Одноразовая миграция данных SQLite → Supabase (PostgreSQL)
//
// Запуск на VPS:
//   docker exec miniapp-sushii-app-1 node /app/scripts/migrate-sqlite-to-pg.js
//
// Или локально (нужен DATABASE_URL и pg):
//   DATABASE_URL=postgresql://... node scripts/migrate-sqlite-to-pg.js
//
// Требует: npm install pg  (добавить перед финальным переключением)
// Идемпотентен: повторный запуск безопасен (ON CONFLICT DO NOTHING)

require('dotenv').config();
const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL не задан');
  process.exit(1);
}

const SQLITE_PATH = path.join(__dirname, '..', 'data', 'sushii.db');
const sqlite = new Database(SQLITE_PATH, { readonly: true });

const pg = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pg.connect();
  try {
    console.log('=== Миграция SQLite → Supabase PostgreSQL ===\n');
    console.log('SQLite:', SQLITE_PATH);
    console.log('PostgreSQL:', process.env.DATABASE_URL.replace(/:[^@]+@/, ':***@'));
    console.log('');

    // ─── 1. users (без invited_by — сначала все пользователи) ─
    console.log('1. Мигрирую users...');
    const users = sqlite.prepare('SELECT * FROM users').all();
    console.log(`   Найдено в SQLite: ${users.length}`);

    let userCount = 0;
    for (const u of users) {
      const res = await client.query(`
        INSERT INTO users (
          telegram_id, name, phone, tariff, invited_by, balance_shc,
          is_ambassador, subscription_status, subscription_start, subscription_end,
          payment_method_id, ref_url, watbot_contact_id, partner_code, notes,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,NULL,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (telegram_id) DO NOTHING
      `, [
        u.telegram_id, u.name || null, u.phone || null, u.tariff || null,
        u.balance_shc || 0,
        u.is_ambassador ? true : false,
        u.subscription_status || null,
        u.subscription_start || null,
        u.subscription_end || null,
        u.payment_method_id || null,
        u.ref_url || null,
        u.watbot_contact_id || null,
        u.partner_code || null,
        u.notes || null,
        u.created_at || new Date().toISOString(),
        u.updated_at || new Date().toISOString(),
      ]);
      if (res.rowCount > 0) userCount++;
    }
    console.log(`   Вставлено: ${userCount} новых\n`);

    // ─── 2. invited_by (после вставки всех пользователей) ──────
    console.log('2. Обновляю invited_by...');
    let invCount = 0;
    for (const u of users) {
      if (!u.invited_by) continue;
      const res = await client.query(
        'UPDATE users SET invited_by = $1 WHERE telegram_id = $2 AND invited_by IS NULL',
        [u.invited_by, u.telegram_id]
      );
      if (res.rowCount > 0) invCount++;
    }
    console.log(`   Обновлено: ${invCount}\n`);

    // ─── 3. payments ────────────────────────────────────────────
    console.log('3. Мигрирую payments...');
    const payments = sqlite.prepare('SELECT * FROM payments ORDER BY id').all();
    console.log(`   Найдено в SQLite: ${payments.length}`);

    let payCount = 0;
    for (const p of payments) {
      const res = await client.query(`
        INSERT INTO payments (id, telegram_id, tariff, amount, months, yookassa_payment_id, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO NOTHING
      `, [
        p.id, p.telegram_id, p.tariff, p.amount, p.months || 1,
        p.yookassa_payment_id || null,
        p.status || 'succeeded',
        p.created_at || new Date().toISOString(),
      ]);
      if (res.rowCount > 0) payCount++;
    }
    if (payments.length > 0) {
      await client.query("SELECT setval('payments_id_seq', (SELECT MAX(id) FROM payments))");
    }
    console.log(`   Вставлено: ${payCount} новых\n`);

    // ─── 4. transactions ────────────────────────────────────────
    console.log('4. Мигрирую transactions...');
    const transactions = sqlite.prepare('SELECT * FROM transactions ORDER BY id').all();
    console.log(`   Найдено в SQLite: ${transactions.length}`);

    let txCount = 0;
    for (const t of transactions) {
      const res = await client.query(`
        INSERT INTO transactions (id, ambassador_id, referral_id, payment_id, payment_amount, commission_amount, commission_percent, level, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO NOTHING
      `, [
        t.id, t.ambassador_id, t.referral_id,
        t.payment_id || null,
        t.payment_amount, t.commission_amount, t.commission_percent,
        t.level || 1,
        t.created_at || new Date().toISOString(),
      ]);
      if (res.rowCount > 0) txCount++;
    }
    if (transactions.length > 0) {
      await client.query("SELECT setval('transactions_id_seq', (SELECT MAX(id) FROM transactions))");
    }
    console.log(`   Вставлено: ${txCount} новых\n`);

    // ─── 5. referral_bonuses ────────────────────────────────────
    console.log('5. Мигрирую referral_bonuses...');
    const bonuses = sqlite.prepare('SELECT * FROM referral_bonuses ORDER BY id').all();
    console.log(`   Найдено в SQLite: ${bonuses.length}`);

    let rbCount = 0;
    for (const b of bonuses) {
      const res = await client.query(`
        INSERT INTO referral_bonuses (id, user_id, referral_id, base_amount, threshold_bonus, total_amount, friends_count, achievement, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO NOTHING
      `, [
        b.id, b.user_id, b.referral_id,
        b.base_amount || 50, b.threshold_bonus || 0, b.total_amount,
        b.friends_count, b.achievement || null,
        b.created_at || new Date().toISOString(),
      ]);
      if (res.rowCount > 0) rbCount++;
    }
    if (bonuses.length > 0) {
      await client.query("SELECT setval('referral_bonuses_id_seq', (SELECT MAX(id) FROM referral_bonuses))");
    }
    console.log(`   Вставлено: ${rbCount} новых\n`);

    // ─── 6. gift_history ────────────────────────────────────────
    console.log('6. Мигрирую gift_history...');
    const gifts = sqlite.prepare('SELECT * FROM gift_history ORDER BY id').all();
    console.log(`   Найдено в SQLite: ${gifts.length}`);

    let ghCount = 0;
    for (const g of gifts) {
      const res = await client.query(`
        INSERT INTO gift_history (id, telegram_id, gift_type, claimed_at, claimed_ts, window_num, granted_by, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO NOTHING
      `, [
        g.id, g.telegram_id, g.gift_type, g.claimed_at, g.claimed_ts,
        g.window_num || null,
        g.granted_by || 'user',
        g.created_at || new Date().toISOString(),
      ]);
      if (res.rowCount > 0) ghCount++;
    }
    if (gifts.length > 0) {
      await client.query("SELECT setval('gift_history_id_seq', (SELECT MAX(id) FROM gift_history))");
    }
    console.log(`   Вставлено: ${ghCount} новых\n`);

    // ─── Итог ───────────────────────────────────────────────────
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users)           AS users,
        (SELECT COUNT(*) FROM payments)        AS payments,
        (SELECT COUNT(*) FROM transactions)    AS transactions,
        (SELECT COUNT(*) FROM referral_bonuses) AS referral_bonuses,
        (SELECT COUNT(*) FROM gift_history)    AS gift_history
    `);
    console.log('=== Итог в PostgreSQL ===');
    console.log(counts.rows[0]);
    console.log('\n✅ Миграция завершена успешно!');

  } catch (err) {
    console.error('\n❌ Ошибка миграции:', err.message);
    throw err;
  } finally {
    client.release();
    await pg.end();
    sqlite.close();
  }
}

run().catch(() => process.exit(1));
