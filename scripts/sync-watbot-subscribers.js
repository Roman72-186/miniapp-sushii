#!/usr/bin/env node
// scripts/sync-watbot-subscribers.js — Синхронизация подписчиков из WATBOT в SQLite
// Запуск: node scripts/sync-watbot-subscribers.js
//
// Что делает:
// 1. Загружает ВСЕ контакты из WATBOT (пагинация)
// 2. Для каждого контакта получает теги
// 3. Фильтрует по тегу «подписка30» (+ Амба)
// 4. Распределяет по тарифам: 290, 490, 1190, амба
// 5. Читает переменные (статусСписания, датаНачала, датаОКОНЧАНИЯ, PaymentID, balance_shc, ref_url, phone)
// 6. Upsert в SQLite

require('dotenv').config();
const { upsertUser, getUser } = require('../api/_lib/db');

const API_TOKEN = process.env.WATBOT_API_TOKEN;
const BOT_ID = 72975;
const BASE = 'https://watbot.ru/api/v1';

if (!API_TOKEN) {
  console.error('WATBOT_API_TOKEN не задан в .env');
  process.exit(1);
}

async function fetchAllContacts() {
  const url = `${BASE}/getContacts?api_token=${API_TOKEN}&bot_id=${BOT_ID}&count=500`;

  const firstRes = await fetch(`${url}&page=1`, { headers: { 'Accept': 'application/json' } });
  if (!firstRes.ok) throw new Error('getContacts error: ' + firstRes.status);

  const firstData = await firstRes.json();
  const lastPage = firstData.meta?.last_page || 1;
  let all = [...(firstData.data || [])];

  console.log(`Страниц: ${lastPage}, контактов на первой: ${all.length}`);

  if (lastPage > 1) {
    for (let p = 2; p <= lastPage; p++) {
      const res = await fetch(`${url}&page=${p}`, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        all = all.concat(data.data || []);
      }
      process.stdout.write(`  страница ${p}/${lastPage}\r`);
      // Пауза между страницами (rate limit)
      await new Promise(r => setTimeout(r, 300));
    }
    console.log('');
  }

  return all;
}

async function fetchTags(contactId) {
  try {
    const res = await fetch(
      `${BASE}/getContactTags?contact_id=${contactId}&api_token=${API_TOKEN}`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const tags = data.data || data || [];
    if (!Array.isArray(tags)) return [];
    return tags.map(t => typeof t === 'string' ? t : (t.name || t.tag || ''));
  } catch (_) {
    return [];
  }
}

function extractVariable(variables, name) {
  if (!Array.isArray(variables)) return '';
  const v = variables.find(x => x.name === name);
  return v && v.value != null ? String(v.value) : '';
}

async function main() {
  console.log('=== Синхронизация подписчиков WATBOT → SQLite ===\n');
  console.log(`Дата: ${new Date().toLocaleString('ru-RU')}\n`);

  // 1. Загружаем все контакты
  console.log('Загрузка контактов из WATBOT...');
  const contacts = await fetchAllContacts();
  console.log(`Всего контактов: ${contacts.length}\n`);

  // 2. Для каждого контакта получаем теги и фильтруем
  let synced = 0;
  let skipped = 0;
  let updated = 0;
  let created = 0;
  const errors = [];
  const stats = { '290': 0, '490': 0, '1190': 0, 'амба': 0, 'без тарифа': 0 };

  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    const tgId = c.telegram_id;
    if (!tgId) { skipped++; continue; }

    // Получаем теги
    const tags = c.id ? await fetchTags(c.id) : [];

    // Фильтр: подписка30 или Амба
    const hasSubscription = tags.includes('подписка30');
    const isAmbassador = tags.includes('Амба');

    if (!hasSubscription && !isAmbassador) {
      skipped++;
      continue;
    }

    // Определяем тариф из тегов (приоритет: Амба > 1190 > 490 > 290)
    let tariff = null;
    if (isAmbassador) {
      tariff = '9990';
      stats['амба']++;
    } else if (tags.includes('1190')) {
      tariff = '1190';
      stats['1190']++;
    } else if (tags.includes('490')) {
      tariff = '490';
      stats['490']++;
    } else if (tags.includes('290')) {
      tariff = '290';
      stats['290']++;
    } else {
      stats['без тарифа']++;
    }

    // Извлекаем переменные
    const vars = c.variables || [];
    const статусСписания = extractVariable(vars, 'статусСписания');
    const датаНачала = extractVariable(vars, 'датаНачала');
    const датаОКОНЧАНИЯ = extractVariable(vars, 'датаОКОНЧАНИЯ');
    const paymentId = extractVariable(vars, 'PaymentID');
    const balanceShc = extractVariable(vars, 'balance_shc');
    const refUrl = extractVariable(vars, 'ref_url');
    const phone = extractVariable(vars, 'phone') || extractVariable(vars, 'телефон');

    // Проверяем что уже в SQLite
    const existing = getUser(tgId);

    try {
      upsertUser({
        telegram_id: String(tgId),
        name: c.name || existing?.name || null,
        phone: phone || existing?.phone || null,
        tariff: tariff || existing?.tariff || null,
        is_ambassador: isAmbassador || existing?.is_ambassador || false,
        subscription_status: статусСписания || existing?.subscription_status || null,
        subscription_start: датаНачала || existing?.subscription_start || null,
        subscription_end: датаОКОНЧАНИЯ || existing?.subscription_end || null,
        payment_method_id: paymentId || existing?.payment_method_id || null,
        balance_shc: balanceShc ? Number(balanceShc) : undefined,
        ref_url: refUrl || existing?.ref_url || null,
        watbot_contact_id: c.id ? String(c.id) : (existing?.watbot_contact_id || null),
      });

      if (existing) updated++;
      else created++;
      synced++;

      // Детальный лог
      const action = existing ? 'UPD' : 'NEW';
      const tarifLabel = tariff || 'n/a';
      const statusLabel = статусСписания || '-';
      console.log(`  [${action}] tg:${tgId} тариф:${tarifLabel} статус:${statusLabel} ${c.name || ''}`);
    } catch (err) {
      errors.push({ tgId, error: err.message });
    }

    // Пауза между запросами тегов (rate limit)
    if (i % 5 === 0) await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n=== Результат ===');
  console.log(`Всего контактов:     ${contacts.length}`);
  console.log(`Пропущено:           ${skipped}`);
  console.log(`Синхронизировано:    ${synced}`);
  console.log(`  - обновлено:       ${updated}`);
  console.log(`  - создано новых:   ${created}`);
  console.log('\nРаспределение по тарифам:');
  console.log(`  290:               ${stats['290']}`);
  console.log(`  490:               ${stats['490']}`);
  console.log(`  1190:              ${stats['1190']}`);
  console.log(`  амба:              ${stats['амба']}`);
  console.log(`  без тарифа:        ${stats['без тарифа']}`);
  if (errors.length > 0) {
    console.log(`\nОшибки:              ${errors.length}`);
    errors.forEach(e => console.log(`  ${e.tgId}: ${e.error}`));
  }
  console.log('\nГотово!');
}

main().catch(err => {
  console.error('Фатальная ошибка:', err);
  process.exit(1);
});
