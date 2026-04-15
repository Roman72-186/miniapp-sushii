// scripts/active-subs-from-watbot.js
// Из списка ватбота (тариф=290) показывает тех, у кого активная подписка в нашей БД
require('dotenv').config();

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });

async function getWatbotIds() {
  const res = await fetch('https://watbot.ru/api/v1/getListItems', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_token: process.env.WATBOT_API_TOKEN,
      schema_id: '69a16dc23dd8ee76a202a802',
      filters: { tarif: '290' },
      limit: 1000,
    }),
  });
  const data = await res.json();
  return (data.data || []).map(i => ({ id_tg: String(i.id_tg), telefon: i.telefon }));
}

function csvRow(fields) {
  return fields.map(f => {
    const s = String(f ?? '');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',');
}

async function main() {
  console.error('[1] Получаю список из ватбота...');
  const watbotItems = await getWatbotIds();
  const ids = watbotItems.map(i => i.id_tg);
  const telefons = Object.fromEntries(watbotItems.map(i => [i.id_tg, i.telefon]));
  console.error(`Записей в ватботе: ${ids.length}`);

  console.error('[2] Ищу активные подписки в БД...');
  const { rows } = await pool.query(
    `SELECT telegram_id, name, phone, tariff, subscription_status, subscription_start, subscription_end, balance_shc
     FROM users
     WHERE telegram_id = ANY($1)
       AND subscription_status IS NOT NULL
       AND subscription_status != 'неактивно'
       AND subscription_end IS NOT NULL
     ORDER BY subscription_end DESC`,
    [ids]
  );
  await pool.end();

  console.error(`Найдено с активной подпиской: ${rows.length}`);

  // CSV
  console.log(csvRow(['telegram_id', 'telefon_watbot', 'name', 'phone_db', 'tariff_db', 'subscription_status', 'subscription_start', 'subscription_end', 'balance_shc']));
  for (const r of rows) {
    console.log(csvRow([
      r.telegram_id,
      telefons[r.telegram_id] ?? '',
      r.name ?? '',
      r.phone ?? '',
      r.tariff ?? '',
      r.subscription_status ?? '',
      r.subscription_start ?? '',
      r.subscription_end ?? '',
      r.balance_shc ?? '',
    ]));
  }
}

main().catch(err => { console.error('Ошибка:', err.message); process.exit(1); });
