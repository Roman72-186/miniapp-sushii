// scripts/inactive-from-watbot.js
// Из найденных в БД (из списка ватбота тариф=290) — те, у кого НЕТ активной подписки
require('dotenv').config();

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });

async function main() {
  const resp = await fetch('https://watbot.ru/api/v1/getListItems', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_token: process.env.WATBOT_API_TOKEN,
      schema_id: '69a16dc23dd8ee76a202a802',
      filters: { tarif: '290' },
      limit: 1000,
    }),
  });
  const data = await resp.json();
  const items = data.data || [];
  const ids = items.map(i => String(i.id_tg));
  const telMap = Object.fromEntries(items.map(i => [String(i.id_tg), i.telefon]));

  // Все найденные в БД
  const allFound = await pool.query(
    `SELECT telegram_id, name, phone, tariff, subscription_status, subscription_start, subscription_end
     FROM users WHERE telegram_id = ANY($1)`,
    [ids]
  );

  // Без активной подписки
  const inactive = allFound.rows.filter(r =>
    !r.subscription_status || r.subscription_status === 'неактивно' || !r.subscription_end
  );

  // Активные (для итогов)
  const active = allFound.rows.filter(r =>
    r.subscription_status && r.subscription_status !== 'неактивно' && r.subscription_end
  );

  const notInDb = ids.length - allFound.rows.length;

  const result = {
    total_watbot: ids.length,
    found_in_db: allFound.rows.length,
    not_found_in_db: notInDb,
    active_subscription: active.length,
    inactive_or_no_subscription: inactive.length,
    inactive_list: inactive.map(r => ({
      telegram_id: r.telegram_id,
      telefon_watbot: telMap[r.telegram_id] ?? null,
      name: r.name ?? null,
      phone_db: r.phone ?? null,
      tariff_db: r.tariff ?? null,
      subscription_status: r.subscription_status ?? null,
      subscription_end: r.subscription_end ?? null,
    })),
  };

  console.log(JSON.stringify(result, null, 2));
  await pool.end();
}

main().catch(err => { console.error('Ошибка:', err.message); process.exit(1); });
