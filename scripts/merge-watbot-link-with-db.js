#!/usr/bin/env node
// scripts/merge-watbot-link-with-db.js
// Сопоставляет контакты из Watbot (с заполненной переменной link) с нашей БД.
// Исключает тех, у кого активная подписка (по subscription_status + датам).
//
// Вход:  /app/data/watbot-users-with-link.json (результат fetch-watbot-users-with-link.js)
// Выход: /app/data/watbot-link-merged.json — три корзины + статистика
//
// Запуск:
//   docker exec miniapp-sushii-app-1 node /app/scripts/merge-watbot-link-with-db.js
//   node scripts/merge-watbot-link-with-db.js /custom/input.json /custom/output.json

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const INPUT_FILE = process.argv[2] || '/app/data/watbot-users-with-link.json';
const OUTPUT_FILE = process.argv[3] || '/app/data/watbot-link-merged.json';

// Подключаем нужный модуль БД
const useSupabase = process.env.USE_SUPABASE === 'true';
const db = useSupabase ? require('../api/_lib/db-pg') : require('../api/_lib/db');
const { getUser } = db;

// Парсинг даты DD.MM.YYYY
function parseDDMMYYYY(s) {
  if (!s || typeof s !== 'string') return null;
  const parts = s.split('.');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

// Проверка «активная подписка»: статус не «неактивно» + сегодня в диапазоне дат
function isSubscriptionActive(user) {
  if (!user) return false;
  if (user.subscription_status === 'неактивно') return false;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const start = parseDDMMYYYY(user.subscription_start);
  const end = parseDDMMYYYY(user.subscription_end);

  if (!start && !end) {
    // Нет дат — ориентируемся только на флаг статуса
    return user.subscription_status === 'активно';
  }
  if (start && today < start) return false;
  if (end && today > end) return false;
  return true;
}

async function main() {
  console.error('');
  console.error('═══════════════════════════════════════════════════════');
  console.error('  Сопоставление Watbot-контактов (link) с БД');
  console.error('═══════════════════════════════════════════════════════');
  console.error(`  БД: ${useSupabase ? 'PostgreSQL (Supabase)' : 'SQLite'}`);
  console.error(`  Вход:  ${INPUT_FILE}`);
  console.error(`  Выход: ${OUTPUT_FILE}`);
  console.error('');

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Входной файл не найден: ${INPUT_FILE}`);
    console.error('   Сначала запусти fetch-watbot-users-with-link.js');
    process.exit(1);
  }

  const input = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  const contacts = input.contacts || [];
  console.error(`📥 Загружено контактов из Watbot: ${contacts.length}`);
  console.error('');

  const matchedNotActive = []; // в БД + подписка НЕ активна → целевая группа
  const matchedActive = [];    // в БД + активная подписка → исключены
  const notInDb = [];          // не нашли в БД по telegram_id

  let processed = 0;
  for (const contact of contacts) {
    const tgId = contact.telegram_id ? String(contact.telegram_id) : null;
    processed++;
    if (processed % 50 === 0) {
      process.stderr.write(`\r  обработано: ${processed} / ${contacts.length}`);
    }

    if (!tgId) {
      notInDb.push({ ...contact, reason: 'no_telegram_id' });
      continue;
    }

    let user = null;
    try { user = await getUser(tgId); } catch (e) { /* ignore */ }

    if (!user) {
      notInDb.push({ ...contact, reason: 'not_found' });
      continue;
    }

    const enriched = {
      ...contact,
      db: {
        name: user.name || null,
        phone: user.phone || null,
        tariff: user.tariff || null,
        subscription_status: user.subscription_status || null,
        subscription_start: user.subscription_start || null,
        subscription_end: user.subscription_end || null,
        balance_shc: Number(user.balance_shc || 0),
        payment_method_id: user.payment_method_id || null,
        invited_by: user.invited_by || null,
        created_at: user.created_at || null,
      },
    };

    if (isSubscriptionActive(user)) {
      matchedActive.push(enriched);
    } else {
      matchedNotActive.push(enriched);
    }
  }
  console.error(`\r  обработано: ${contacts.length} / ${contacts.length}`);
  console.error('');

  const output = {
    processed_at: new Date().toISOString(),
    source_file: INPUT_FILE,
    stats: {
      total_from_watbot: contacts.length,
      matched_not_active: matchedNotActive.length,
      matched_active_excluded: matchedActive.length,
      not_in_db: notInDb.length,
    },
    matched_not_active: matchedNotActive,
    matched_active: matchedActive,
    not_in_db: notInDb,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  console.error('═══════════════════════════════════════════════════════');
  console.error('📊 РЕЗУЛЬТАТ');
  console.error('═══════════════════════════════════════════════════════');
  console.error(`  Всего из Watbot (с link):     ${contacts.length}`);
  console.error(`  Целевая группа (в БД, НЕ активные): ${matchedNotActive.length}`);
  console.error(`  Исключено (активная подписка):      ${matchedActive.length}`);
  console.error(`  Не найдено в БД:                    ${notInDb.length}`);
  console.error('───────────────────────────────────────────────────────');
  console.error(`💾 Сохранено: ${OUTPUT_FILE}`);
  console.error('');

  if (matchedNotActive.length > 0) {
    console.error('Примеры целевой группы (первые 10):');
    matchedNotActive.slice(0, 10).forEach(c => {
      const tariff = c.db.tariff ? `т.${c.db.tariff}` : '—';
      const status = c.db.subscription_status || '—';
      const end = c.db.subscription_end || '—';
      console.error(`   ${String(c.telegram_id).padEnd(14)} | ${(c.db.name || c.name || '').padEnd(22)} | ${tariff} ${status.padEnd(9)} до ${end}`);
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
