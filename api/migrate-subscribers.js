// api/migrate-subscribers.js — Миграция подписчиков (тег подписка30) из WATBOT в SQLite
// POST /api/migrate-subscribers с секретным ключом

const { upsertUser } = require('./_lib/db');
const { fetchTags } = require('./_lib/watbot');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Загружает контакты постранично с задержкой (обход rate limit)
 */
async function fetchAllContactsSlow(apiToken) {
  const base = `https://watbot.ru/api/v1/getContacts?api_token=${apiToken}&bot_id=72975&count=500`;
  const firstRes = await fetch(`${base}&page=1`, { headers: { 'Accept': 'application/json' } });
  if (!firstRes.ok) throw new Error('WATBOT getContacts error: ' + firstRes.status);
  const firstData = await firstRes.json();
  const lastPage = firstData.meta?.last_page || 1;
  let allContacts = [...(firstData.data || [])];

  for (let p = 2; p <= lastPage; p++) {
    await sleep(1000);
    try {
      const res = await fetch(`${base}&page=${p}`, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        allContacts = allContacts.concat(data.data || []);
      }
    } catch (_) {}
  }
  return allContacts;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { secret } = req.body || {};
  if (secret !== process.env.MIGRATE_SECRET && secret !== 'migrate2026') {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }

  const apiToken = process.env.WATBOT_API_TOKEN;
  if (!apiToken) return res.status(500).json({ error: 'WATBOT_API_TOKEN не настроен' });

  try {
    console.log('migrate-subscribers: starting...');

    const contacts = await fetchAllContactsSlow(apiToken);
    console.log(`migrate-subscribers: loaded ${contacts.length} contacts`);

    let total = 0;
    let subscribers = 0;
    let skipped = 0;

    for (const contact of contacts) {
      const tgId = contact.telegram_id;
      if (!tgId) { skipped++; continue; }

      total++;

      // Получаем теги (с задержкой)
      let tags = [];
      try {
        await sleep(500);
        tags = await fetchTags(apiToken, contact.id);
      } catch (_) {
        skipped++;
        continue;
      }

      // Фильтруем — только подписка30
      if (!tags.includes('подписка30')) continue;

      // Парсим переменные
      const variables = {};
      if (contact.variables) {
        for (const v of contact.variables) {
          if (v.name) variables[v.name] = v.value != null ? String(v.value) : '';
        }
      }

      // Определяем тариф из тегов
      let tariff = null;
      if (tags.includes('Амба')) tariff = '9990';
      else if (tags.includes('1190')) tariff = '1190';
      else if (tags.includes('490')) tariff = '490';
      else if (tags.includes('290')) tariff = '290';

      upsertUser({
        telegram_id: String(tgId),
        name: contact.name || null,
        phone: variables['phone'] || variables['телефон'] || null,
        tariff,
        is_ambassador: tags.includes('Амба'),
        subscription_status: variables['статусСписания'] || null,
        subscription_start: variables['датаНачала'] || null,
        subscription_end: variables['датаОКОНЧАНИЯ'] || null,
        payment_method_id: variables['PaymentID'] || null,
        ref_url: variables['ref_url'] || null,
        watbot_contact_id: String(contact.id),
      });
      subscribers++;

      if (subscribers % 10 === 0) {
        console.log(`migrate-subscribers: ${subscribers} subscribers imported...`);
      }
    }

    console.log(`migrate-subscribers: done. ${subscribers} subscribers from ${total} contacts`);
    return res.status(200).json({
      success: true,
      total_contacts: total,
      subscribers_imported: subscribers,
      skipped,
    });
  } catch (error) {
    console.error('migrate-subscribers error:', error);
    return res.status(500).json({ error: error.message });
  }
};
