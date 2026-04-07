// api/sync-user.js — Синхронизация данных пользователя
// Источник данных: SQLite (primary) → файловый кэш

const { readUserCache, writeUserCache } = require('./_lib/user-cache');
const { getUser, upsertUser, generatePartnerCode, getPartnerByCode } = require('./_lib/db');
const { readGiftWindows } = require('./_lib/blob-store');
const { deriveFromDbUser } = require('./_lib/subscription-state');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://sushii-miniapp.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { telegram_id, force, tg_name } = req.body || {};
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });

  // 🔍 DEBUG: Логируем входящий запрос
  console.log('[sync-user] Запрос:', { telegram_id, force, tg_name: tg_name ? 'exists' : 'empty' });

  try {
    // Обновляем имя из Telegram только если в БД пусто И имя не тестовое
    if (tg_name) {
      const existing = await getUser(telegram_id);
      const isTestName = tg_name.toLowerCase().includes('test') || tg_name.toLowerCase().includes('user');

      // 🔍 DEBUG: Логируем проверку имени
      console.log('[sync-user] Проверка имени:', {
        telegram_id,
        tg_name,
        existing_name: existing?.name,
        is_test_name: isTestName,
        should_update: !existing || (!existing.name && !isTestName),
      });

      if (!existing) {
        // Создаём нового пользователя с именем из Telegram (если не тестовое)
        await upsertUser({ telegram_id: String(telegram_id), name: isTestName ? null : tg_name });
      } else if (!existing.name) {
        // Обновляем имя только если в БД пусто и имя не тестовое
        if (!isTestName) {
          await upsertUser({ telegram_id: String(telegram_id), name: tg_name });
        }
      }
      // Если имя уже есть в БД — не перезаписываем!
    }
    // 1. Проверяем файловый кэш (TTL)
    if (!force) {
      const cached = await readUserCache(telegram_id);
      if (cached && cached.syncedAt) {
        const age = Date.now() - new Date(cached.syncedAt).getTime();
        
        // 🔍 DEBUG: Логируем проверку TTL
        console.log('[sync-user] Проверка кэша:', {
          telegram_id,
          age_ms: age,
          age_sec: Math.round(age / 1000),
          ttl_ms: CACHE_TTL_MS,
          ttl_min: CACHE_TTL_MS / 60000,
          is_valid: age < CACHE_TTL_MS,
        });
        
        if (age < CACHE_TTL_MS) {
          console.log('[sync-user] Кэш валиден, возвращаем из кэша');
          return res.status(200).json({ success: true, data: cached, fromCache: true });
        } else {
          console.log('[sync-user] Кэш устарел (age=%d сек), обновляем', Math.round(age / 1000));
        }
      } else {
        console.log('[sync-user] Кэш не найден или не имеет syncedAt');
      }
    } else {
      console.log('[sync-user] Принудительное обновление (force=true)');
    }

    // 2. SQLite — единственный источник данных
    let dbUser = await getUser(telegram_id);

    // Автогенерация ref_url если отсутствует
    if (dbUser && !dbUser.ref_url) {
      const generatedUrl = `https://sushi-house-39.ru/?invited_by=${telegram_id}`;
      await upsertUser({ telegram_id: String(telegram_id), ref_url: generatedUrl });
      dbUser = await getUser(telegram_id);
    }

    // Автогенерация partner_code если отсутствует
    if (dbUser && !dbUser.partner_code) {
      let code;
      let attempts = 0;
      do {
        code = generatePartnerCode();
        attempts++;
      } while ((await getPartnerByCode(code)) && attempts < 10);
      await upsertUser({ telegram_id: String(telegram_id), partner_code: code });
      dbUser = await getUser(telegram_id);
    }

    // Проверка обязательных полей
    if (!dbUser) {
      console.error('[sync-user] Пользователь не найден в БД:', telegram_id);
      return res.status(404).json({
        error: 'Пользователь не найден',
        details: 'Не удалось найти пользователя в базе данных'
      });
    }

    // 🔍 DEBUG: Логируем данные из БД
    console.log('[sync-user] Данные из БД для', telegram_id, ':', {
      tariff: dbUser?.tariff,
      subscription_status: dbUser?.subscription_status,
      subscription_start: dbUser?.subscription_start,
      subscription_end: dbUser?.subscription_end,
      payment_method_id: dbUser?.payment_method_id,
      is_ambassador: dbUser?.is_ambassador,
    });

    // Проверка корректности дат
    if (dbUser.subscription_status === 'активно' && (!dbUser.subscription_start || !dbUser.subscription_end)) {
      console.warn('[sync-user] Активная подписка без дат:', {
        telegram_id,
        subscription_start: dbUser.subscription_start,
        subscription_end: dbUser.subscription_end
      });
    }

    let tarif = dbUser?.tariff || null;
    const isAmbassador = !!dbUser?.is_ambassador;
    const hasActiveSubscription = dbUser?.subscription_status === 'активно' && dbUser?.tariff;
    const tags = [];
    if (tarif) tags.push(tarif);
    if (isAmbassador) {
      tags.push('амба');
      // Амба без оплаченного тарифа получает привилегии 290
      if (!tarif) tarif = '290';
    }
    // Добавляем тег активной подписки
    if (hasActiveSubscription) {
      tags.push('подписка30');
    }

    // Проверка корректности тарифа
    if (hasActiveSubscription && !['290', '490', '1190', '9990'].includes(tarif)) {
      console.warn('[sync-user] Неизвестный тариф:', {
        telegram_id,
        tarif,
        subscription_status: dbUser.subscription_status
      });
    }
    
    // 🔍 DEBUG: Логируем вычисленные значения
    console.log('[sync-user] Вычисленные теги и тариф:', {
      tarif,
      tags,
      hasActiveSubscription,
      isAmbassador,
    });

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
      'partner_code': dbUser?.partner_code || '',
      'invited_by': dbUser?.invited_by || '',
      'датаПодарка': giftDate,
    };

    // 🔍 DEBUG: Вычисляем статус подписки через deriveFromDbUser
    const derived = deriveFromDbUser(dbUser);
    console.log('[sync-user] Derived subscription:', derived);

    const cacheData = {
      telegram_id: String(telegram_id),
      syncedAt: new Date().toISOString(),
      contact: { id: dbUser?.watbot_contact_id || null, name: dbUser?.name || null },
      variables,
      tags,
      tarif,
      derived, // Добавляем вычисленный статус подписки
      listItem: dbUser ? { name: dbUser.name, telefon: dbUser.phone } : null,
    };
    
    // 🔍 DEBUG: Логируем итоговый объект кэша
    console.log('[sync-user] Итоговые данные кэша:', {
      telegram_id: cacheData.telegram_id,
      tarif: cacheData.tarif,
      tags: cacheData.tags,
      'variables.статусСписания': cacheData.variables['статусСписания'],
      'variables.датаНачала': cacheData.variables['датаНачала'],
      'variables.датаОКОНЧАНИЯ': cacheData.variables['датаОКОНЧАНИЯ'],
    });

    // 3. Записываем в файловый кэш
    await writeUserCache(telegram_id, cacheData);

    return res.status(200).json({ success: true, data: cacheData, fromCache: false });
  } catch (error) {
    // 🔍 DEBUG: Логируем полную ошибку
    console.error('[sync-user] Критическая ошибка:', {
      message: error.message,
      stack: error.stack,
      telegram_id,
    });

    // Fallback 1: SQLite данные напрямую
    try {
      const dbUser = await getUser(telegram_id);
      if (dbUser && dbUser.tariff) {
        console.log('[sync-user] Fallback: возвращаем данные из SQLite');
        const fallbackData = {
          telegram_id: String(telegram_id),
          syncedAt: new Date().toISOString(),
          contact: null,
          variables: {
            'статусСписания': dbUser.subscription_status || '',
            'датаНачала': dbUser.subscription_start || '',
            'датаОКОНЧАНИЯ': dbUser.subscription_end || '',
          },
          tags: dbUser.is_ambassador ? ['амба'] : [],
          tarif: dbUser.tariff || (dbUser.is_ambassador ? '290' : null),
          listItem: { name: dbUser.name, telefon: dbUser.phone },
        };
        return res.status(200).json({ success: true, data: fallbackData, fromCache: false, source: 'sqlite' });
      }
    } catch (fallbackError) {
      console.error('[sync-user] Fallback SQLite не удался:', fallbackError.message);
    }

    // Fallback 2: файловый кэш
    try {
      const fallback = await readUserCache(telegram_id);
      if (fallback) {
        console.log('[sync-user] Fallback: возвращаем данные из кэша (stale)');
        return res.status(200).json({ success: true, data: fallback, fromCache: true, stale: true });
      }
    } catch (cacheError) {
      console.error('[sync-user] Fallback кэш не удался:', cacheError.message);
    }

    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
