// api/sync-user.js — Синхронизация данных пользователя
// Источник данных: SQLite (primary) → файловый кэш → WATBOT (optional enrichment)

const { readUserCache, writeUserCache } = require('./_lib/user-cache');
const { getUser, upsertUser } = require('./_lib/db');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут

/**
 * Пытается обогатить данные из WATBOT (необязательно — если WATBOT недоступен, работаем без него)
 */
async function enrichFromWatbot(apiToken, telegramId) {
  if (!apiToken) return null;

  try {
    const { findContact, fetchTags } = require('./_lib/watbot');

    const contact = await findContact(apiToken, telegramId);
    if (!contact) return null;

    let tags = [];
    if (contact.id) {
      tags = await fetchTags(apiToken, contact.id);
    }

    const variables = {};
    if (contact.variables) {
      for (const v of contact.variables) {
        const name = v.name || '';
        const value = v.value != null ? String(v.value) : '';
        if (name) variables[name] = value;
      }
    }

    // listItem для телефона/имени
    let listItemData = null;
    try {
      const res = await fetch('https://watbot.ru/api/v1/getListItems?api_token=' + apiToken, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema_id: '69a16dc23dd8ee76a202a802',
          filters: { id_tg: String(telegramId) },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const item = (data.data || [])[0];
        if (item) {
          listItemData = {
            name: item.name || item.Name || null,
            telefon: item.telefon || item.phone || item.Telefon || null,
          };
        }
      }
    } catch (_) {}

    // Тариф из тегов
    let tarif = null;
    if (tags.includes('Амба')) tarif = '9990';
    else if (tags.includes('1190')) tarif = '1190';
    else if (tags.includes('490')) tarif = '490';
    else if (tags.includes('290')) tarif = '290';

    return { contact, tags, variables, listItemData, tarif };
  } catch (err) {
    console.warn('sync-user: WATBOT enrichment failed:', err.message);
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { telegram_id, force } = req.body || {};
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });

  try {
    // 1. Проверяем файловый кэш (TTL)
    if (!force) {
      const cached = await readUserCache(telegram_id);
      if (cached && cached.syncedAt) {
        const age = Date.now() - new Date(cached.syncedAt).getTime();
        if (age < CACHE_TTL_MS) {
          return res.status(200).json({ success: true, data: cached, fromCache: true });
        }
      }
    }

    // 2. SQLite — основной источник данных
    const dbUser = getUser(telegram_id);

    // 3. WATBOT — необязательное обогащение (может быть недоступен)
    const apiToken = process.env.WATBOT_API_TOKEN;
    const watbot = await enrichFromWatbot(apiToken, telegram_id);

    // 4. Собираем итоговые данные (SQLite приоритет, WATBOT дополняет)
    let tarif = dbUser?.tariff || watbot?.tarif || null;
    const tags = watbot?.tags || [];
    const variables = watbot?.variables || {};
    const listItemData = watbot?.listItemData || null;
    const contact = watbot?.contact || null;

    // Подписочные даты: SQLite приоритет
    if (!variables['датаНачала'] && dbUser?.subscription_start) {
      variables['датаНачала'] = dbUser.subscription_start;
    }
    if (!variables['датаОКОНЧАНИЯ'] && dbUser?.subscription_end) {
      variables['датаОКОНЧАНИЯ'] = dbUser.subscription_end;
    }
    if (!variables['статусСписания'] && dbUser?.subscription_status) {
      variables['статусСписания'] = dbUser.subscription_status;
    }
    if (!variables['PaymentID'] && dbUser?.payment_method_id) {
      variables['PaymentID'] = dbUser.payment_method_id;
    }

    // Амбассадор из SQLite
    const isAmbassador = dbUser?.is_ambassador || tags.includes('Амба');
    if (isAmbassador && !tags.includes('Амба')) tags.push('Амба');

    // Формируем кэш
    const cacheData = {
      telegram_id: String(telegram_id),
      syncedAt: new Date().toISOString(),
      contact: contact ? { id: contact.id, name: contact.name || null } : null,
      variables,
      tags,
      tarif,
      listItem: listItemData || (dbUser ? { name: dbUser.name, telefon: dbUser.phone } : null),
    };

    // 5. Записываем в файловый кэш
    await writeUserCache(telegram_id, cacheData);

    // 6. Синхронизируем в SQLite (обновляем данными из WATBOT если есть)
    try {
      upsertUser({
        telegram_id: String(telegram_id),
        name: contact?.name || listItemData?.name || dbUser?.name || null,
        phone: listItemData?.telefon || variables['phone'] || variables['телефон'] || dbUser?.phone || null,
        tariff: tarif,
        is_ambassador: isAmbassador,
        subscription_status: variables['статусСписания'] || dbUser?.subscription_status || null,
        subscription_start: variables['датаНачала'] || dbUser?.subscription_start || null,
        subscription_end: variables['датаОКОНЧАНИЯ'] || dbUser?.subscription_end || null,
        payment_method_id: variables['PaymentID'] || dbUser?.payment_method_id || null,
        ref_url: variables['ref_url'] || dbUser?.ref_url || null,
        watbot_contact_id: contact?.id ? String(contact.id) : (dbUser?.watbot_contact_id || null),
      });
    } catch (dbErr) {
      console.error('sync-user: SQLite upsert error:', dbErr.message);
    }

    return res.status(200).json({ success: true, data: cacheData, fromCache: false });
  } catch (error) {
    console.error('sync-user error:', error.message);

    // Fallback 1: SQLite данные напрямую
    try {
      const dbUser = getUser(telegram_id);
      if (dbUser && dbUser.tariff) {
        const fallbackData = {
          telegram_id: String(telegram_id),
          syncedAt: new Date().toISOString(),
          contact: null,
          variables: {
            'статусСписания': dbUser.subscription_status || '',
            'датаНачала': dbUser.subscription_start || '',
            'датаОКОНЧАНИЯ': dbUser.subscription_end || '',
          },
          tags: dbUser.is_ambassador ? ['Амба'] : [],
          tarif: dbUser.tariff,
          listItem: { name: dbUser.name, telefon: dbUser.phone },
        };
        return res.status(200).json({ success: true, data: fallbackData, fromCache: false, source: 'sqlite' });
      }
    } catch (_) {}

    // Fallback 2: файловый кэш
    try {
      const fallback = await readUserCache(telegram_id);
      if (fallback) {
        return res.status(200).json({ success: true, data: fallback, fromCache: true, stale: true });
      }
    } catch (_) {}

    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
