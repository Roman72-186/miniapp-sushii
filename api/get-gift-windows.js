// api/get-gift-windows.js — Получение статуса подарочных окон
// Источник данных: SQLite (primary) → файловый blob-store

const { buildWindows, computeStatus } = require('./_lib/gift-windows');
const { readGiftWindows, writeGiftWindows } = require('./_lib/blob-store');
const { getUser } = require('./_lib/db');
const { readUserCache } = require('./_lib/user-cache');

/**
 * При пересоздании окон сохраняет claimed статусы из старого массива
 */
function mergeClaimedWindows(newWindows, oldWindows) {
  if (!oldWindows || oldWindows.length === 0) return newWindows;

  for (const nw of newWindows) {
    const match = oldWindows.find(ow =>
      ow.start === nw.start && ow.end === nw.end && ow.status === 'claimed'
    );
    if (match) {
      nw.status = 'claimed';
      nw.claimedAt = match.claimedAt;
    }
  }
  return newWindows;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { telegram_id } = req.body || {};
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });

  try {
    let tarif = null;
    let датаНачала = '';
    let датаОКОНЧАНИЯ = '';

    // 1. SQLite — основной источник
    const dbUser = getUser(telegram_id);
    if (dbUser && dbUser.tariff) {
      tarif = dbUser.tariff;
      датаНачала = dbUser.subscription_start || '';
      датаОКОНЧАНИЯ = dbUser.subscription_end || '';
    }

    // 2. Файловый кэш — дополнение (может быть свежее)
    if (!tarif || !датаНачала) {
      try {
        const cache = await readUserCache(telegram_id);
        if (cache) {
          if (!tarif && cache.tarif) tarif = cache.tarif;
          if (!датаНачала && cache.variables) {
            датаНачала = cache.variables['датаНачала'] || '';
            датаОКОНЧАНИЯ = cache.variables['датаОКОНЧАНИЯ'] || '';
          }
        }
      } catch (_) {}
    }

    // Нет данных — expired
    if (!tarif || (tarif !== '490' && tarif !== '1190')) {
      return res.status(200).json({
        success: true,
        data: { tarif: tarif || null, currentStatus: 'expired', daysLeft: 0, currentWindow: 0, totalWindows: 0, windows: [] },
      });
    }

    if (!датаНачала || !датаОКОНЧАНИЯ) {
      return res.status(200).json({
        success: true,
        data: { tarif, currentStatus: 'expired', daysLeft: 0, currentWindow: 0, totalWindows: 0, windows: [] },
      });
    }

    const windowDays = tarif === '1190' ? 30 : 15;

    // 3. Читаем сохранённые окна
    let stored = await readGiftWindows(telegram_id);

    // 4. Пересоздаём если изменились параметры
    const needRebuild = !stored ||
      stored.startDate !== датаНачала ||
      stored.endDate !== датаОКОНЧАНИЯ ||
      stored.tarif !== tarif;

    if (needRebuild) {
      const newWindows = buildWindows(датаНачала, датаОКОНЧАНИЯ, windowDays);
      const mergedWindows = stored ? mergeClaimedWindows(newWindows, stored.windows) : newWindows;

      stored = {
        telegram_id: String(telegram_id),
        tarif,
        startDate: датаНачала,
        endDate: датаОКОНЧАНИЯ,
        windowDays,
        totalWindows: mergedWindows.length,
        windows: mergedWindows,
        updatedAt: new Date().toISOString(),
      };

      await writeGiftWindows(telegram_id, stored);
    }

    // 5. Статус
    const status = computeStatus(stored.windows);

    return res.status(200).json({
      success: true,
      data: {
        tarif,
        currentStatus: status.currentStatus,
        daysLeft: status.daysLeft,
        currentWindow: status.currentWindow,
        totalWindows: status.totalWindows,
        windows: stored.windows,
      },
    });
  } catch (error) {
    console.error('get-gift-windows error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
