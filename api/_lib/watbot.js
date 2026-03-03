// api/_lib/watbot.js — Утилиты для работы с WATBOT API (CommonJS)

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

/**
 * Загружает ВСЕ контакты из WATBOT (пагинация)
 */
async function fetchAllContacts(apiToken) {
  const base = `https://watbot.ru/api/v1/getContacts?api_token=${apiToken}&bot_id=72975&count=500`;

  const firstRes = await fetch(`${base}&page=1`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!firstRes.ok) throw new Error('WATBOT getContacts error: ' + firstRes.status);

  const firstData = await firstRes.json();
  const lastPage = firstData.meta?.last_page || 1;
  let allContacts = [...(firstData.data || [])];

  if (lastPage > 1) {
    const pageNums = [];
    for (let p = 2; p <= lastPage; p++) pageNums.push(p);

    const results = await Promise.all(
      pageNums.map(p =>
        fetch(`${base}&page=${p}`, { headers: { 'Accept': 'application/json' } })
          .then(r => r.json())
          .then(data => data.data || [])
          .catch(() => [])
      )
    );
    for (const page of results) {
      allContacts = allContacts.concat(page);
    }
  }

  return allContacts;
}

module.exports = { findContact, fetchTags, fetchAllContacts };
