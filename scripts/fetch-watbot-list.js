// scripts/fetch-watbot-list.js — Выборка записей из списка ватбота по тарифу
// Запуск: WATBOT_API_TOKEN=xxx node scripts/fetch-watbot-list.js
// Или на VPS: node -e "require('dotenv').config()" scripts/fetch-watbot-list.js

require('dotenv').config();

const API_TOKEN = process.env.WATBOT_API_TOKEN;
const SCHEMA_ID = process.argv[2] || '69a16dc23dd8ee76a202a802';
const TARIF_FILTER = process.argv[3] || '290';
const BASE = 'https://watbot.ru/api/v1';

if (!API_TOKEN) {
  console.error('Ошибка: WATBOT_API_TOKEN не задан');
  process.exit(1);
}

async function post(endpoint, body) {
  const res = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ api_token: API_TOKEN, ...body }),
  });
  if (!res.ok) {
    throw new Error(`${endpoint} → HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  // Шаг 1: узнать схему списка (поля и их slug-и)
  console.error(`\n[1] Загружаю схему списка ${SCHEMA_ID}...`);
  const schema = await post('getListSchema', { schema_id: SCHEMA_ID });
  // fields — объект { slug: { name, type, ... } }
  const fieldsObj = schema?.data?.fields || schema?.fields || {};
  const fieldSlugs = Object.keys(fieldsObj);
  console.error('Поля списка:');
  fieldSlugs.forEach(slug => {
    const f = fieldsObj[slug];
    console.error(`  slug="${slug}"  name="${f.name}"  type=${f.type}`);
  });

  // Шаг 2: определить slug поля тарифа
  const filterSlug = fieldSlugs.find(s =>
    /тариф|tarif|tariff/i.test(s) || /тариф|tarif|tariff/i.test(fieldsObj[s]?.name)
  ) || 'tarif';
  console.error(`\n[2] Фильтрую по полю "${filterSlug}" = "${TARIF_FILTER}"`);

  // Шаг 3: забрать все записи (с пагинацией)
  let page = 1, all = [];
  while (true) {
    const data = await post('getListItems', {
      schema_id: SCHEMA_ID,
      filters: { [filterSlug]: TARIF_FILTER },
      limit: 1000,
      page,
    });

    const items = data?.data || data?.items || [];
    console.error(`  страница ${page}: получено ${items.length} записей`);

    if (!items.length) break;
    all = all.concat(items);
    if (items.length < 1000) break;
    page++;
    await new Promise(r => setTimeout(r, 300)); // rate limit: 2 req/s
  }

  console.error(`\nИтого записей с тарифом ${TARIF_FILTER}: ${all.length}`);

  // Если фильтр не дал результатов — вернуть всё и отфильтровать локально
  if (all.length === 0) {
    console.error('\n[!] Фильтр не дал результатов. Загружаю все записи для локальной фильтрации...');
    page = 1;
    let allItems = [];
    while (true) {
      const data = await post('getListItems', { schema_id: SCHEMA_ID, limit: 1000, page });
      const items = data?.data || data?.items || [];
      console.error(`  страница ${page}: ${items.length} записей`);
      if (!items.length) break;
      allItems = allItems.concat(items);
      if (items.length < 1000) break;
      page++;
      await new Promise(r => setTimeout(r, 300));
    }

    // Показать уникальные значения поля тарифа
    const slugsToCheck = fieldSlugs;
    const tarifValues = new Set();
    allItems.forEach(item => {
      slugsToCheck.forEach(s => {
        const v = item[s] ?? item.data?.[s];
        if (v !== undefined && v !== null) tarifValues.add(`${s}=${v}`);
      });
    });
    console.error('\nВсе значения полей (образец первых 30):');
    [...tarifValues].slice(0, 30).forEach(v => console.error(' ', v));

    // Локальная фильтрация по всем полям
    all = allItems.filter(item =>
      slugsToCheck.some(s => {
        const v = String(item[s] ?? item.data?.[s] ?? '');
        return v === TARIF_FILTER;
      })
    );
    console.error(`\nПосле локальной фильтрации: ${all.length} записей`);
  }

  // Вывод результата
  console.log(JSON.stringify({ schema_id: SCHEMA_ID, tarif: TARIF_FILTER, count: all.length, items: all }, null, 2));
}

main().catch(err => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});
