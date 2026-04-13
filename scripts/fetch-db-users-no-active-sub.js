#!/usr/bin/env node
// scripts/fetch-db-users-no-active-sub.js
// Собирает из нашей БД всех пользователей с числовым telegram_id (не web_),
// у которых подписка НЕ активна.
//
// Активной считается: status != 'неактивно' И сегодня в диапазоне [start, end].
// Всё остальное (неактивно, истёкшая, без подписки, NULL) попадает в выборку.
//
// Запуск:
//   docker exec miniapp-sushii-app-1 node /app/scripts/fetch-db-users-no-active-sub.js
//   node scripts/fetch-db-users-no-active-sub.js /custom/out.json

require('dotenv').config();

const fs = require('fs');

const OUTPUT_FILE = process.argv[2] || '/app/data/db-users-no-active-sub.json';

const useSupabase = process.env.USE_SUPABASE === 'true';
const db = useSupabase ? require('../api/_lib/db-pg') : require('../api/_lib/db');

function parseDDMMYYYY(s) {
  if (!s || typeof s !== 'string') return null;
  const parts = s.split('.');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function isSubscriptionActive(user) {
  if (!user) return false;
  if (user.subscription_status === 'неактивно') return false;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const start = parseDDMMYYYY(user.subscription_start);
  const end = parseDDMMYYYY(user.subscription_end);

  if (!start && !end) return user.subscription_status === 'активно';
  if (start && today < start) return false;
  if (end && today > end) return false;
  return true;
}

async function queryAllUsers() {
  if (useSupabase) {
    const res = await db.query('SELECT * FROM users ORDER BY updated_at DESC');
    return res.rows;
  }
  return db.getDb().prepare('SELECT * FROM users ORDER BY updated_at DESC').all();
}

async function main() {
  console.error('');
  console.error('═══════════════════════════════════════════════════════');
  console.error('  Выгрузка юзеров БД с числовым telegram_id без активной подписки');
  console.error('═══════════════════════════════════════════════════════');
  console.error(`  БД: ${useSupabase ? 'PostgreSQL (Supabase)' : 'SQLite'}`);
  console.error(`  Выход: ${OUTPUT_FILE}`);
  console.error('');

  const all = await queryAllUsers();
  console.error(`📥 Всего в users: ${all.length}`);

  const numeric = all.filter(u => {
    const id = String(u.telegram_id || '');
    return id && !id.startsWith('web_') && /^\d+$/.test(id);
  });
  console.error(`🔢 С числовым telegram_id: ${numeric.length}`);

  const webOnly = all.length - numeric.length;
  console.error(`   (web_* и прочие: ${webOnly})`);

  const noActive = numeric.filter(u => !isSubscriptionActive(u));
  console.error(`❌ Без активной подписки: ${noActive.length}`);
  console.error(`✅ С активной подпиской: ${numeric.length - noActive.length}`);
  console.error('');

  const result = noActive.map(u => ({
    telegram_id: u.telegram_id,
    name: u.name || null,
    first_name: u.first_name || null,
    last_name: u.last_name || null,
    middle_name: u.middle_name || null,
    phone: u.phone || null,
    tariff: u.tariff || null,
    subscription_status: u.subscription_status || null,
    subscription_start: u.subscription_start || null,
    subscription_end: u.subscription_end || null,
    payment_method_id: u.payment_method_id || null,
    is_ambassador: !!u.is_ambassador,
    balance_shc: Number(u.balance_shc || 0),
    invited_by: u.invited_by || null,
    partner_code: u.partner_code || null,
    created_at: u.created_at || null,
    updated_at: u.updated_at || null,
  }));

  const output = {
    fetched_at: new Date().toISOString(),
    stats: {
      total_in_db: all.length,
      with_numeric_telegram_id: numeric.length,
      web_users: webOnly,
      without_active_subscription: noActive.length,
      with_active_subscription: numeric.length - noActive.length,
    },
    users: result,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  console.error('═══════════════════════════════════════════════════════');
  console.error(`💾 Сохранено: ${OUTPUT_FILE} (${result.length} записей)`);
  console.error('═══════════════════════════════════════════════════════');
  console.error('');

  // Примеры
  if (result.length > 0) {
    console.error('Примеры (первые 10):');
    result.slice(0, 10).forEach(u => {
      const tariff = u.tariff ? `т.${u.tariff}` : '—'.padEnd(5);
      const status = (u.subscription_status || '—').padEnd(9);
      const end = u.subscription_end || '—';
      console.error(`   ${String(u.telegram_id).padEnd(14)} | ${String(u.name || '').padEnd(22)} | ${tariff.padEnd(6)} ${status} до ${end}`);
    });
    console.error('');
  }

  if (db.pool && typeof db.pool.end === 'function') {
    await db.pool.end();
  }
}

main().catch(err => {
  console.error('\n❌ Ошибка:', err.message);
  console.error(err.stack);
  process.exit(1);
});
