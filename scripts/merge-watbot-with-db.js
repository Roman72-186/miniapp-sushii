// scripts/merge-watbot-with-db.js
// Сопоставляет записи из ватбота (тариф=290) с нашей БД и выводит CSV
// Запуск на VPS: node scripts/merge-watbot-with-db.js > /tmp/merged-290.csv

require('dotenv').config();

const API_TOKEN = process.env.WATBOT_API_TOKEN;
const SCHEMA_ID = process.argv[2] || '69a16dc23dd8ee76a202a802';
const TARIF_FILTER = process.argv[3] || '290';
const BASE = 'https://watbot.ru/api/v1';

async function post(endpoint, body) {
  const res = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ api_token: API_TOKEN, ...body }),
  });
  return res.json();
}

function csvRow(fields) {
  return fields.map(f => {
    const s = String(f ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  }).join(',');
}

async function main() {
  // 1. Получить записи из ватбота
  console.error(`[1] Загружаю записи из ватбота (тариф=${TARIF_FILTER})...`);
  let page = 1, watbotItems = [];
  while (true) {
    const data = await post('getListItems', {
      schema_id: SCHEMA_ID,
      filters: { tarif: TARIF_FILTER },
      limit: 1000,
      page,
    });
    const items = data?.data || data?.items || [];
    if (!items.length) break;
    watbotItems = watbotItems.concat(items);
    if (items.length < 1000) break;
    page++;
  }
  console.error(`Получено из ватбота: ${watbotItems.length} записей`);

  // 2. Подключиться к БД
  const useSupabase = process.env.USE_SUPABASE === 'true';
  console.error(`[2] Подключаюсь к БД (${useSupabase ? 'PostgreSQL/Supabase' : 'SQLite'})...`);

  let getUser;
  if (useSupabase) {
    const db = require('../api/_lib/db-pg');
    getUser = db.getUser;
  } else {
    const db = require('../api/_lib/db');
    getUser = db.getUser;
  }

  // 3. Сопоставить
  console.error('[3] Сопоставляю с БД...');

  const header = [
    'id_tg', 'telefon_watbot', 'tarif_watbot',
    'found_in_db',
    'name', 'phone_db', 'tariff_db',
    'subscription_status', 'subscription_start', 'subscription_end',
    'balance_shc', 'is_ambassador', 'invited_by', 'partner_code',
    'created_at',
  ];
  console.log(csvRow(header));

  let found = 0, notFound = 0;
  for (const item of watbotItems) {
    const tgId = String(item.id_tg || '');
    let user = null;
    try {
      user = await getUser(tgId);
    } catch {}

    if (user) found++;
    else notFound++;

    console.log(csvRow([
      tgId,
      item.telefon ?? '',
      item.tarif ?? '',
      user ? 'да' : 'нет',
      user?.name ?? '',
      user?.phone ?? '',
      user?.tariff ?? '',
      user?.subscription_status ?? '',
      user?.subscription_start ?? '',
      user?.subscription_end ?? '',
      user?.balance_shc ?? '',
      user?.is_ambassador ? 'да' : (user ? 'нет' : ''),
      user?.invited_by ?? '',
      user?.partner_code ?? '',
      user?.created_at ?? '',
    ]));
  }

  console.error(`\nГотово: найдено в БД ${found}/${watbotItems.length}, не найдено ${notFound}`);
}

main().catch(err => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});
