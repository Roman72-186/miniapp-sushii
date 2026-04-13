#!/usr/bin/env node
// scripts/fetch-watbot-users-with-link.js
// Выгружает всех пользователей Watbot, у которых заполнена переменная `link`.
//
// Запуск:
//   node scripts/fetch-watbot-users-with-link.js                 # имя переменной = "link"
//   node scripts/fetch-watbot-users-with-link.js ссылка          # кастомное имя
//   node scripts/fetch-watbot-users-with-link.js link /tmp/out.json
//
// Требует: WATBOT_API_TOKEN в .env
// API: https://docs.watbot.ru/rabota-s-api/kontakty → GET /api/v1/getContacts

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const API_TOKEN = process.env.WATBOT_API_TOKEN;
const BOT_ID = 72975;
const BASE = 'https://watbot.ru/api/v1';
const PER_PAGE = 500;

const VAR_NAME = process.argv[2] || 'link';
const OUT_FILE = process.argv[3] || path.join(__dirname, 'watbot-users-with-link.json');

if (!API_TOKEN) {
  console.error('Ошибка: WATBOT_API_TOKEN не задан в .env');
  process.exit(1);
}

async function fetchPage(page) {
  const url = `${BASE}/getContacts?api_token=${encodeURIComponent(API_TOKEN)}&bot_id=${BOT_ID}&count=${PER_PAGE}&page=${page}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} на странице ${page}: ${await res.text()}`);
  }
  return res.json();
}

function getVar(variables, name) {
  if (!Array.isArray(variables)) return null;
  const v = variables.find(x => x && x.name === name);
  if (!v) return null;
  const val = v.value;
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s.length > 0 ? s : null;
}

async function main() {
  console.error('');
  console.error('═══════════════════════════════════════════════════════');
  console.error(`  Watbot → getContacts → фильтр по переменной "${VAR_NAME}"`);
  console.error('═══════════════════════════════════════════════════════');

  // Первая страница — узнаём сколько всего
  console.error('\n📡 Загружаю первую страницу...');
  const first = await fetchPage(1);
  const lastPage = first.meta?.last_page || 1;
  const total = first.meta?.total || 0;
  console.error(`   Всего контактов: ${total}, страниц: ${lastPage}`);

  const allContacts = [...(first.data || [])];

  // Остальные страницы
  for (let p = 2; p <= lastPage; p++) {
    const d = await fetchPage(p);
    allContacts.push(...(d.data || []));
    process.stderr.write(`\r   Загружено: ${allContacts.length} / ${total}`);
    await new Promise(r => setTimeout(r, 300)); // rate limit 2 req/s
  }
  console.error(`\n   Получено: ${allContacts.length} контактов\n`);

  // Фильтрация по наличию переменной
  console.error(`🔍 Фильтрую: variables["${VAR_NAME}"] непустая...`);
  const filtered = [];
  for (const contact of allContacts) {
    const linkValue = getVar(contact.variables, VAR_NAME);
    if (linkValue) {
      filtered.push({
        id: contact.id,
        bot_id: contact.bot_id,
        telegram_id: contact.telegram_id || null,
        telegram_username: contact.telegram_username || null,
        phone: contact.phone || null,
        email: contact.email || null,
        name: contact.name || null,
        messenger: contact.messenger || null,
        created_at: contact.created_at || null,
        [VAR_NAME]: linkValue,
      });
    }
  }

  console.error(`   Найдено с "${VAR_NAME}": ${filtered.length} из ${allContacts.length}\n`);

  // Сохранение результата
  const output = {
    fetched_at: new Date().toISOString(),
    variable_filter: VAR_NAME,
    total_fetched: allContacts.length,
    total_matched: filtered.length,
    contacts: filtered,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.error(`💾 Сохранено: ${OUT_FILE}`);
  console.error('');

  // Краткая статистика
  if (filtered.length > 0) {
    console.error('📊 Примеры найденных записей (первые 5):');
    filtered.slice(0, 5).forEach(c => {
      console.error(`   ${String(c.telegram_id || '—').padEnd(14)} | ${(c.name || '').padEnd(24)} | ${c[VAR_NAME]}`);
    });
    console.error('');
  }
}

main().catch(err => {
  console.error('\n❌ Ошибка:', err.message);
  process.exit(1);
});
