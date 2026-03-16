// api/admin-claim-gift.js — Отметить подарок как полученный вручную (admin)
const { checkAuth } = require('./_lib/admin-auth');
const { readGiftWindows, writeGiftWindows } = require('./_lib/blob-store');
const { formatDDMMYYYY, todayUTC } = require('./_lib/gift-windows');

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
    const stored = await readGiftWindows(telegram_id);
    if (!stored || !stored.windows || stored.windows.length === 0) {
      return res.status(400).json({ error: 'Нет подарочных окон' });
    }

    // Ищем первое available окно нужного типа (или любое available если тип совпадает с тарифом)
    const window = stored.windows.find(w =>
      w.status === 'available' && (
        (w.grantType === type) ||
        (!w.grantType && ((type === 'roll' && stored.tarif === '490') || (type === 'set' && stored.tarif === '1190')))
      )
    );

    if (!window) {
      return res.status(400).json({ error: 'Нет доступного окна для отметки' });
    }

    window.status = 'claimed';
    window.claimedAt = formatDDMMYYYY(todayUTC());
    window.claimedBy = 'admin';
    stored.updatedAt = new Date().toISOString();

    await writeGiftWindows(telegram_id, stored);

    return res.status(200).json({ success: true, window });
  } catch (error) {
    console.error('admin-claim-gift error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
