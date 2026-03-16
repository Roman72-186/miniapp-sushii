// api/admin-grant-gift.js — Выдать один подарок пользователю (admin)
const { checkAuth } = require('./_lib/admin-auth');
const { readGiftWindows, writeGiftWindows } = require('./_lib/blob-store');
const { formatDDMMYYYY, addDays, todayUTC } = require('./_lib/gift-windows');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  const { telegram_id, type } = req.body || {};

  if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });
  if (!type || (type !== 'roll' && type !== 'set')) {
    return res.status(400).json({ error: 'type должен быть "roll" или "set"' });
  }

  try {
    const today = todayUTC();
    const days = type === 'set' ? 30 : 15;
    const endDate = addDays(today, days);

    const newWindow = {
      num: 1,
      start: formatDDMMYYYY(today),
      end: formatDDMMYYYY(endDate),
      status: 'available',
      claimedAt: null,
      grantedBy: 'admin',
      grantType: type,
    };

    // Читаем существующие окна
    let stored = await readGiftWindows(telegram_id);

    if (stored && stored.windows && stored.windows.length > 0) {
      // Добавляем к существующим, нумерация продолжается
      const maxNum = Math.max(...stored.windows.map(w => w.num));
      newWindow.num = maxNum + 1;
      stored.windows.push(newWindow);
      stored.updatedAt = new Date().toISOString();
    } else {
      // Создаём новую запись
      stored = {
        telegram_id: String(telegram_id),
        tarif: type === 'set' ? '1190' : '490',
        startDate: formatDDMMYYYY(today),
        endDate: formatDDMMYYYY(endDate),
        windowDays: days,
        totalWindows: 1,
        windows: [newWindow],
        updatedAt: new Date().toISOString(),
      };
    }

    stored.totalWindows = stored.windows.length;

    await writeGiftWindows(telegram_id, stored);

    return res.status(200).json({
      success: true,
      window: newWindow,
    });
  } catch (error) {
    console.error('admin-grant-gift error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
