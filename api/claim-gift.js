// api/claim-gift.js — Отметить подарочное окно как полученное (Vercel Blob + WATBOT)
// Vercel Serverless Function (CommonJS)

const { getCurrentWindow, formatDDMMYYYY, todayUTC, parseDDMMYYYY } = require('./_lib/gift-windows');
const { readGiftWindows, writeGiftWindows } = require('./_lib/blob-store');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { telegram_id, contact_id } = req.body || {};
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });

  const apiToken = process.env.WATBOT_API_TOKEN;
  if (!apiToken) return res.status(500).json({ error: 'Ошибка конфигурации сервера' });

  try {
    // 1. Прочитать JSON из Blob (debug)
    const { list } = require('@vercel/blob');
    const listResult = await list({ prefix: 'gifts/' + telegram_id + '.json' });
    const stored = await readGiftWindows(telegram_id);
    if (!stored || !stored.windows || stored.windows.length === 0) {
      return res.status(400).json({
        error: 'Данные подарочных окон не найдены',
        debug: {
          stored,
          blobCount: listResult.blobs?.length,
          blobPaths: listResult.blobs?.map(b => b.pathname),
          hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
        },
      });
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

    // 4. Записать обратно в Blob
    await writeGiftWindows(telegram_id, stored);

    // 5. Обратная совместимость: записать датаПодарка в WATBOT
    if (contact_id) {
      try {
        await fetch('https://watbot.ru/api/v1/setContactVariable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            api_token: apiToken,
            bot_id: 72975,
            contact_id: Number(contact_id),
            name: 'датаПодарка',
            value: today,
          }),
        });
      } catch (_) { /* не блокируем успех */ }
    }

    // 6. Вычислить дату следующего окна
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
