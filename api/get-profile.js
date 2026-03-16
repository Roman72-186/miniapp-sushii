// api/get-profile.js — Получение профиля подписчика (SQLite + blob-store)

const { readUserCache } = require('./_lib/user-cache');
const { getUser } = require('./_lib/db');
const { readGiftWindows } = require('./_lib/blob-store');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const { telegram_id } = req.body || {};

  if (!telegram_id) {
    return res.status(400).json({ error: 'telegram_id обязателен' });
  }

  try {
    // 1. Попытка из кэша (быстрый путь)
    const cache = await readUserCache(telegram_id);
    if (cache && cache.contact) {
      const v = cache.variables || {};
      return res.status(200).json({
        name: cache.contact.name || null,
        phone: (cache.listItem && cache.listItem.telefon) || null,
        статусСписания: v['статусСписания'] || null,
        balance_shc: v['balance_shc'] || null,
        датаОКОНЧАНИЯ: v['датаОКОНЧАНИЯ'] || null,
        датаНачала: v['датаНачала'] || null,
        датаПодарка: v['датаПодарка'] || null,
        contact_id: cache.contact.id || null,
        ref_url: v['ref_url'] || null,
        has_payment_id: !!v['PaymentID'],
      });
    }

    // 2. Fallback: SQLite + blob-store
    const dbUser = getUser(telegram_id);
    if (!dbUser) {
      return res.status(404).json({ error: 'Контакт не найден' });
    }

    // Читаем датаПодарка из blob-store
    let giftDate = null;
    try {
      const giftData = await readGiftWindows(telegram_id);
      if (giftData?.windows) {
        const claimed = giftData.windows.filter(w => w.claimedAt).sort((a, b) => b.num - a.num);
        if (claimed.length > 0) giftDate = claimed[0].claimedAt;
      }
    } catch (_) {}

    return res.status(200).json({
      name: dbUser.name || null,
      phone: dbUser.phone || null,
      статусСписания: dbUser.subscription_status || null,
      balance_shc: dbUser.balance_shc ? String(dbUser.balance_shc) : null,
      датаОКОНЧАНИЯ: dbUser.subscription_end || null,
      датаНачала: dbUser.subscription_start || null,
      датаПодарка: giftDate,
      contact_id: dbUser.watbot_contact_id || null,
      ref_url: dbUser.ref_url || null,
      has_payment_id: !!dbUser.payment_method_id,
    });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
