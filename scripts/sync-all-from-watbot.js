#!/usr/bin/env node
// scripts/sync-all-from-watbot.js
// Полная синхронизация всех пользователей из WatBot → SQLite
// Обновляет телефоны и данные для всех существующих пользователей.
// Добавляет новых подписчиков (теги подписка30/Амба) если их нет в БД.
//
// Запуск: node scripts/sync-all-from-watbot.js

require('dotenv').config();
const { upsertUser, getUser, getDb } = require('../api/_lib/db');

const API_TOKEN = process.env.WATBOT_API_TOKEN;
const BOT_ID = 72975;
const BASE = 'https://watbot.ru/api/v1';

if (!API_TOKEN) {
  console.error('WATBOT_API_TOKEN не задан в .env');
  process.exit(1);
}

function getVar(variables, ...names) {
  for (const name of names) {
    const v = variables.find(v => v.name === name);
    if (v && v.value !== null && v.value !== '' && v.value !== 0) {
      return String(v.value);
    }
  }
  return null;
}

function normalizePhone(raw) {
  if (!raw) return null;
  const nums = String(raw).replace(/\D/g, '');
  if (nums.length === 11 && nums.startsWith('8')) return '7' + nums.slice(1);
  if (nums.length === 11 && nums.startsWith('7')) return nums;
  if (nums.length === 10) return '7' + nums;
  return nums.length >= 10 ? nums : null;
}

async function fetchPage(page) {
  const url = `${BASE}/getContacts?api_token=${API_TOKEN}&bot_id=${BOT_ID}&count=500&page=${page}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} page ${page}`);
  return res.json();
}

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   СИНХРОНИЗАЦИЯ ТЕЛЕФОНОВ И ДАННЫХ ИЗ WATBOT          ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');

  // Загружаем все контакты
  console.log('📡 Загружаем контакты из WatBot...');
  const first = await fetchPage(1);
  const lastPage = first.meta?.last_page || 1;
  let all = [...(first.data || [])];
  console.log(`   Страниц: ${lastPage}, контактов всего: ${first.meta?.total || '?'}`);

  for (let p = 2; p <= lastPage; p++) {
    const d = await fetchPage(p);
    all = all.concat(d.data || []);
    process.stdout.write(`\r   Загружено: ${all.length}`);
  }
  console.log(`\n   Получено: ${all.length} контактов`);

  // Все telegram_id из SQLite
  const db = getDb();
  const sqliteUsers = db.prepare('SELECT telegram_id, phone FROM users').all();
  const sqliteIds = new Set(sqliteUsers.map(u => String(u.telegram_id)));
  console.log(`\n📊 В SQLite сейчас: ${sqliteUsers.length} пользователей`);

  // Тип тегов для подписки
  const SUB_TAGS = ['подписка30', 'Амба', 'амба', 'подписка'];

  let updated = 0;
  let added = 0;
  let skipped = 0;
  let noPhone = 0;

  for (const contact of all) {
    const tgId = String(contact.telegram_id || '');
    if (!tgId || tgId === 'null') { skipped++; continue; }

    const vars = contact.variables || [];
    const tags = (contact.tags || []).map(t => String(t).toLowerCase());

    // Телефон из переменных
    const rawPhone = getVar(vars, 'phone', 'телефон', 'Phone', 'Телефон');
    const phone = normalizePhone(rawPhone);

    const subscriptionStatus = getVar(vars, 'статусСписания');
    const subscriptionStart  = getVar(vars, 'датаНачала');
    const subscriptionEnd    = getVar(vars, 'датаОКОНЧАНИЯ');
    const paymentMethodId    = getVar(vars, 'PaymentID');
    const balanceShc         = getVar(vars, 'balance_shc');
    const refUrl             = getVar(vars, 'ref_url');
    const tariff             = getVar(vars, 'amount1', 'amount');

    const hasSubTag = tags.some(t => SUB_TAGS.some(st => t.includes(st)));
    const isInDb    = sqliteIds.has(tgId);

    if (!phone) {
      // Обновим только если уже в БД
      if (isInDb) {
        // данные есть, телефона нет в WatBot — не трогаем
      }
      noPhone++;
      continue;
    }

    if (isInDb) {
      // Обновляем телефон и данные
      upsertUser({
        telegram_id: tgId,
        name: contact.name || null,
        phone,
        ...(subscriptionStatus && { subscription_status: subscriptionStatus }),
        ...(subscriptionStart  && { subscription_start: subscriptionStart }),
        ...(subscriptionEnd    && { subscription_end: subscriptionEnd }),
        ...(paymentMethodId    && { payment_method_id: paymentMethodId }),
        ...(balanceShc != null && { balance_shc: Number(balanceShc) }),
        ...(refUrl             && { ref_url: refUrl }),
        ...(tariff             && { tariff }),
        watbot_contact_id: String(contact.id),
      });
      updated++;
    } else if (hasSubTag) {
      // Новый подписчик — добавляем
      upsertUser({
        telegram_id: tgId,
        name: contact.name || null,
        phone,
        tariff: tariff || null,
        subscription_status: subscriptionStatus || null,
        subscription_start: subscriptionStart || null,
        subscription_end: subscriptionEnd || null,
        payment_method_id: paymentMethodId || null,
        balance_shc: balanceShc ? Number(balanceShc) : 0,
        ref_url: refUrl || null,
        watbot_contact_id: String(contact.id),
      });
      added++;
    }
  }

  // Итог
  const totalAfter  = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const activeAfter = db.prepare("SELECT COUNT(*) as c FROM users WHERE subscription_status = 'активно'").get().c;
  const withPhoneAfter = db.prepare("SELECT COUNT(*) as c FROM users WHERE phone IS NOT NULL AND phone != ''").get().c;

  const stillNoPhone = db.prepare("SELECT telegram_id, name FROM users WHERE (phone IS NULL OR phone = '') AND subscription_status = 'активно'").all();

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 РЕЗУЛЬТАТ');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Обновлено (телефон+данные): ${updated}`);
  console.log(`   Добавлено новых:            ${added}`);
  console.log(`   В WatBot без телефона:      ${noPhone}`);
  console.log('───────────────────────────────────────────────────────');
  console.log(`   Всего в SQLite:    ${totalAfter}`);
  console.log(`   Активных:          ${activeAfter}`);
  console.log(`   С телефоном:       ${withPhoneAfter}`);

  if (stillNoPhone.length) {
    console.log(`\n⚠️  Активные без телефона (${stillNoPhone.length}):`);
    stillNoPhone.forEach(u => console.log(`   - ${u.telegram_id} ${u.name || ''}`));
  } else {
    console.log('\n✅ Все активные пользователи имеют телефон!');
  }

  console.log('═══════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
});
