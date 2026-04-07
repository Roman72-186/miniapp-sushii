// api/admin-subscribers.js — Список подписчиков из SQLite + данные подарков
const { checkAuth } = require('./_lib/admin-auth');
const { getDb } = require('./_lib/db');
const fs = require('fs');
const path = require('path');

const GIFTS_DIR = path.join(__dirname, '..', 'data', 'gifts');

/**
 * Читает подарочные окна пользователя (синхронно, для массовой загрузки)
 */
function readGiftWindowsSync(telegramId) {
  try {
    const filePath = path.join(GIFTS_DIR, `${telegramId}.json`);
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  try {
    const db = getDb();

    // Все пользователи с подпиской (tariff не null)
    const rows = db.prepare(`
      SELECT telegram_id, name, phone, tariff, is_ambassador,
             subscription_status, subscription_start, subscription_end,
             balance_shc, notes, created_at, updated_at
      FROM users
      WHERE tariff IS NOT NULL
      ORDER BY
        CASE tariff WHEN '9990' THEN 1 WHEN '1190' THEN 2 WHEN '490' THEN 3 WHEN '290' THEN 4 ELSE 5 END,
        updated_at DESC
    `).all();

    // Статистика
    const stats = {
      total: rows.length,
      by_tariff: {},
      ambassadors: 0,
      active: 0,
    };

    // Добавляем данные подарков
    const subscribers = rows.map(s => {
      stats.by_tariff[s.tariff] = (stats.by_tariff[s.tariff] || 0) + 1;
      if (s.is_ambassador) stats.ambassadors++;
      if (s.subscription_status === 'активно') stats.active++;

      // Подарочные окна
      const giftData = readGiftWindowsSync(s.telegram_id);
      let gifts = null;
      if (giftData && giftData.windows) {
        const claimed = giftData.windows.filter(w => w.status === 'claimed');
        const total = giftData.windows.length;
        gifts = {
          totalWindows: total,
          claimed: claimed.length,
          remaining: total - claimed.length,
          lastClaimed: claimed.length > 0
            ? claimed.sort((a, b) => (b.claimedAt || '').localeCompare(a.claimedAt || ''))[0].claimedAt
            : null,
          windows: giftData.windows.map(w => ({
            num: w.num,
            start: w.start,
            end: w.end,
            status: w.status,
            claimedAt: w.claimedAt || null,
          })),
        };
      }

      return { ...s, gifts };
    });

    return res.status(200).json({ success: true, subscribers, stats });
  } catch (error) {
    console.error('admin-subscribers error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
