// api/sync-user.js — Синхронизация данных пользователя
// Источник данных: SQLite (primary) → файловый кэш

const { readUserCache, writeUserCache } = require('./_lib/user-cache');
const { getUser, upsertUser } = require('./_lib/db');
const { readGiftWindows } = require('./_lib/blob-store');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут

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

    // 2. SQLite — единственный источник данных
    const dbUser = getUser(telegram_id);

    const tarif = dbUser?.tariff || null;
    const isAmbassador = !!dbUser?.is_ambassador;
    const tags = [];
    if (tarif) tags.push(tarif);
    if (isAmbassador) tags.push('Амба');

    // Читаем датаПодарка из blob-store
    let giftDate = '';
    try {
      const giftData = await readGiftWindows(telegram_id);
      if (giftData?.windows) {
        const claimed = giftData.windows.filter(w => w.claimedAt).sort((a, b) => b.num - a.num);
        if (claimed.length > 0) giftDate = claimed[0].claimedAt;
      }
    } catch (_) {}

    const variables = {
      'статусСписания': dbUser?.subscription_status || '',
      'датаНачала': dbUser?.subscription_start || '',
      'датаОКОНЧАНИЯ': dbUser?.subscription_end || '',
      'PaymentID': dbUser?.payment_method_id || '',
      'balance_shc': dbUser?.balance_shc ? String(dbUser.balance_shc) : '',
      'ref_url': dbUser?.ref_url || '',
      'датаПодарка': giftDate,
    };

    const cacheData = {
      telegram_id: String(telegram_id),
      syncedAt: new Date().toISOString(),
      contact: { id: dbUser?.watbot_contact_id || null, name: dbUser?.name || null },
      variables,
      tags,
      tarif,
      listItem: dbUser ? { name: dbUser.name, telefon: dbUser.phone } : null,
    };

    // 3. Записываем в файловый кэш
    await writeUserCache(telegram_id, cacheData);

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
