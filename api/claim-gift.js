// api/claim-gift.js — Отметить подарочное окно как полученное (файловый blob-store)

const { getCurrentWindow, formatDDMMYYYY, todayUTC, parseDDMMYYYY } = require('./_lib/gift-windows');
const { readGiftWindows, writeGiftWindows } = require('./_lib/blob-store');
const { insertGiftHistory } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { telegram_id, address, gift_name } = req.body || {};
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });

  try {
    // 1. Прочитать JSON из blob-store
    const stored = await readGiftWindows(telegram_id);
    if (!stored || !stored.windows || stored.windows.length === 0) {
      return res.status(400).json({ error: 'Данные подарочных окон не найдены' });
    }

    // 2. Найти текущее окно
    const current = getCurrentWindow(stored.windows);
    if (!current) {
      return res.status(400).json({ error: 'Нет активного окна для получения подарка' });
    }

    if (current.status === 'claimed') {
      return res.status(400).json({ error: 'Подарок в этом окне уже получен' });
    }

    // 3. Пометить claimed
    const today = formatDDMMYYYY(todayUTC());
    const windowInArray = stored.windows.find(w => w.num === current.num);
    windowInArray.status = 'claimed';
    windowInArray.claimedAt = today;
    stored.updatedAt = new Date().toISOString();

    // 4. Записать обратно в blob-store
    await writeGiftWindows(telegram_id, stored);

    // 4a. Логировать в SQLite gift_history
    try {
      const giftType = windowInArray.grantType || (stored.tarif === '1190' ? 'set' : 'roll');
      await insertGiftHistory({
        telegramId: telegram_id,
        giftType,
        claimedAt: today,
        claimedTs: new Date().toISOString(),
        windowNum: windowInArray.num,
        grantedBy: windowInArray.grantedBy || 'user',
        address: address || null,
        giftName: gift_name || null,
      });
    } catch (histErr) {
      console.error('gift_history insert error:', histErr.message);
    }

    // 5. Вычислить дату следующего окна
    let nextWindowDate = null;
    const nextWindow = stored.windows.find(w => w.num === current.num + 1);
    if (nextWindow) {
      nextWindowDate = nextWindow.start;
    }

    return res.status(200).json({
      success: true,
      claimedWindow: current.num,
      nextWindowDate,
    });
  } catch (error) {
    console.error('claim-gift error:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
