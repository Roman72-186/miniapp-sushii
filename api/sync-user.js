// api/sync-user.js — Синхронизация данных пользователя (WATBOT → Vercel Blob кэш)
// Vercel Serverless Function (CommonJS)

const { readUserCache, writeUserCache } = require('./_lib/user-cache');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут

/**
 * Находит контакт по telegram_id в WATBOT (пагинация getContacts)
 */
async function findContact(apiToken, telegramId) {
  const tgId = String(telegramId);
  const base = `https://watbot.ru/api/v1/getContacts?api_token=${apiToken}&bot_id=72975&count=500`;

  const firstRes = await fetch(`${base}&page=1`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!firstRes.ok) throw new Error('WATBOT getContacts error: ' + firstRes.status);

  const firstData = await firstRes.json();
  const lastPage = firstData.meta?.last_page || 1;

  let contact = (firstData.data || []).find(c => c.telegram_id === tgId);

  if (!contact && lastPage > 1) {
    const pageNums = [];
    for (let p = 2; p <= lastPage; p++) pageNums.push(p);

    const results = await Promise.all(
      pageNums.map(p =>
        fetch(`${base}&page=${p}`, { headers: { 'Accept': 'application/json' } })
          .then(r => r.json())
          .then(data => (data.data || []).find(c => c.telegram_id === tgId) || null)
          .catch(() => null)
      )
    );
    contact = results.find(c => c !== null) || null;
  }

  return contact;
}

/**
 * Получает запись пользователя из WATBOT getListItems
 */
async function getListItem(apiToken, telegramId) {
  const res = await fetch('https://watbot.ru/api/v1/getListItems?api_token=' + apiToken, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schema_id: '69a16dc23dd8ee76a202a802',
      filters: { id_tg: String(telegramId) },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const items = data.data || [];
  if (items.length === 0) return null;
  return items[0];
}

/**
 * Получает теги контакта из WATBOT
 */
async function fetchTags(apiToken, contactId) {
  const res = await fetch(
    `https://watbot.ru/api/v1/getContactTags?contact_id=${contactId}&api_token=${apiToken}`,
    { headers: { 'Accept': 'application/json' } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const tags = data.data || data || [];
  if (!Array.isArray(tags)) return [];
  return tags.map(t => typeof t === 'string' ? t : (t.name || t.tag || ''));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { telegram_id, force } = req.body || {};
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });

  const apiToken = process.env.WATBOT_API_TOKEN;
  if (!apiToken) return res.status(500).json({ error: 'Ошибка конфигурации сервера' });

  try {
    // 1. Проверяем кэш
    if (!force) {
      const cached = await readUserCache(telegram_id);
      if (cached && cached.syncedAt) {
        const age = Date.now() - new Date(cached.syncedAt).getTime();
        if (age < CACHE_TTL_MS) {
          return res.status(200).json({ success: true, data: cached, fromCache: true });
        }
      }
    }

    // 2. Параллельно: findContact + getListItem
    const [contact, listItem] = await Promise.all([
      findContact(apiToken, telegram_id),
      getListItem(apiToken, telegram_id),
    ]);

    // 3. Последовательно: fetchTags (зависит от contact.id)
    let tags = [];
    if (contact && contact.id) {
      tags = await fetchTags(apiToken, contact.id);
    }

    // 4. Собираем variables как словарь
    const variables = {};
    if (contact && contact.variables) {
      for (const v of contact.variables) {
        const name = v.name || '';
        const value = v.value != null ? String(v.value) : '';
        if (name) variables[name] = value;
      }
    }

    // 5. Собираем listItem данные (name/phone для автозаполнения)
    const listItemData = listItem ? {
      name: listItem.name || listItem.Name || null,
      telefon: listItem.telefon || listItem.phone || listItem.Telefon || null,
    } : null;

    // 6. Определяем тариф из тегов контакта (приоритет: 9990 > 1190 > 490 > 290)
    let tarif = null;
    if (tags.includes('9990')) tarif = '9990';
    else if (tags.includes('1190')) tarif = '1190';
    else if (tags.includes('490')) tarif = '490';
    else if (tags.includes('290')) tarif = '290';

    // 7. Формируем кэш
    const cacheData = {
      telegram_id: String(telegram_id),
      syncedAt: new Date().toISOString(),
      contact: contact ? { id: contact.id, name: contact.name || null } : null,
      variables,
      tags,
      tarif,
      listItem: listItemData,
    };

    // 7. Записываем в Blob
    await writeUserCache(telegram_id, cacheData);

    return res.status(200).json({ success: true, data: cacheData, fromCache: false });
  } catch (error) {
    console.error('sync-user error:', error.message);
    // Fallback: пробуем вернуть старый кэш
    try {
      const fallback = await readUserCache(telegram_id);
      if (fallback) {
        return res.status(200).json({ success: true, data: fallback, fromCache: true, stale: true });
      }
    } catch (_) {}
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
