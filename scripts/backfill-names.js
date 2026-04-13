// scripts/backfill-names.js
// Разовый скрипт: заполняет first_name / last_name / middle_name из существующего поля name
// для всех пользователей, у кого новые поля ещё не заполнены.
//
// Использование:
//   node scripts/backfill-names.js           # SQLite (dev)
//   USE_SUPABASE=true node scripts/backfill-names.js   # PostgreSQL (prod)
//
// Логика сплита: name разбивается по первому пробелу на first_name + остаток → last_name.
// Если в name три слова — третье идёт в middle_name.
// Колонки first_name/last_name/middle_name должны быть уже созданы (миграция в db.js).

require('dotenv').config();

const USE_PG = process.env.USE_SUPABASE === 'true';

function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || null,
    last_name: parts[1] || null,
    middle_name: parts.slice(2).join(' ') || null,
  };
}

async function runSqlite() {
  const Database = require('better-sqlite3');
  const path = require('path');
  const db = new Database(path.join(__dirname, '..', 'data', 'sushii.db'));

  // Убедимся что колонки существуют
  try { db.exec('ALTER TABLE users ADD COLUMN first_name TEXT'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN last_name TEXT'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN middle_name TEXT'); } catch {}

  const rows = db.prepare(
    "SELECT telegram_id, name FROM users WHERE name IS NOT NULL AND name != '' AND (first_name IS NULL OR first_name = '')"
  ).all();

  console.log(`[backfill] SQLite: найдено ${rows.length} пользователей для миграции`);

  const upd = db.prepare(
    'UPDATE users SET first_name = ?, last_name = ?, middle_name = ? WHERE telegram_id = ?'
  );

  let count = 0;
  for (const row of rows) {
    const parts = splitName(row.name);
    upd.run(parts.first_name, parts.last_name, parts.middle_name, row.telegram_id);
    count++;
  }

  console.log(`[backfill] SQLite: обновлено ${count} записей`);
  db.close();
}

async function runPg() {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Убедимся что колонки существуют
  try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT'); } catch {}
  try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT'); } catch {}
  try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name TEXT'); } catch {}

  const { rows } = await pool.query(
    "SELECT telegram_id, name FROM users WHERE name IS NOT NULL AND name != '' AND (first_name IS NULL OR first_name = '')"
  );

  console.log(`[backfill] PostgreSQL: найдено ${rows.length} пользователей для миграции`);

  let count = 0;
  for (const row of rows) {
    const parts = splitName(row.name);
    await pool.query(
      'UPDATE users SET first_name = $1, last_name = $2, middle_name = $3 WHERE telegram_id = $4',
      [parts.first_name, parts.last_name, parts.middle_name, row.telegram_id]
    );
    count++;
  }

  console.log(`[backfill] PostgreSQL: обновлено ${count} записей`);
  await pool.end();
}

(async () => {
  try {
    if (USE_PG) await runPg();
    else await runSqlite();
    console.log('[backfill] Готово');
    process.exit(0);
  } catch (err) {
    console.error('[backfill] Ошибка:', err);
    process.exit(1);
  }
})();
