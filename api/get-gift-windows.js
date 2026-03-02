// api/get-gift-windows.js — Получение статуса подарочных окон (Vercel Blob + WATBOT)
// Vercel Serverless Function (CommonJS)

const { buildWindows, computeStatus, parseDDMMYYYY, formatDDMMYYYY } = require('./lib/gift-windows');
const { readGiftWindows, writeGiftWindows } = require('./lib/blob-store');

/**
 * Находит контакт по telegram_id в WATBOT (аналог get-profile)
 */
async function findContact(apiToken, telegramId) {
  const tgId = String(telegramId);
  const base = `https://watbot.ru/api/v1/getContacts?api_token=${apiToken}&bot_id=72975&count=500`;

  const firstRes = await fetch(`${base}&page=1`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!firstRes.ok) throw new Error('WATBOT API error: ' + firstRes.status);

  const firstData = await firstRes.json();
  const lastPage = firstData.meta?.last_page || 1;

  let contact = (firstData.data || []).find(c => c.telegram_id === tgId);

  if (!contact && lastPage > 1) {
    const pageNums = [];
    for (let p = 2; p <= lastPage; p++) pageNums.push(p);

    const results = await Promise.all(
      pageNums.map(p =>
        fetch(`${base}&page=${p}`, { headers: { 'Accept': 'application/json' } })
          .then(r => r.json())
          .then(data => (data.data || []).find(c => c.telegram_id === tgId) || null)
          .catch(() => null)
      )
    );
    contact = results.find(c => c !== null) || null;
  }

  return contact;
}

/**
 * Извлекает переменные из контакта WATBOT
 */
function extractVariables(contact) {
  const vars = {};
  for (const v of (contact.variables || [])) {
    const name = v.name || '';
    const value = v.value != null ? String(v.value) : '';
    if (['датаНачала', 'датаОКОНЧАНИЯ', 'датаПодарка'].includes(name)) {
      vars[name] = value;
    }
  }
  return vars;
}

/**
 * Определяет тариф через check-subscription логику (getListItems)
 */
async function getTarif(apiToken, telegramId) {
  const res = await fetch('https://watbot.ru/api/v1/getListItems?api_token=' + apiToken, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schema_id: '69a16dc23dd8ee76a202a802',
      filters: { id_tg: String(telegramId) },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const items = data.data || [];
  if (items.length === 0) return null;
  const item = items[0];
  return String(item.tarif || item.Tarif || item.tariff || '');
}

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

  const apiToken = process.env.WATBOT_API_TOKEN;
  if (!apiToken) return res.status(500).json({ error: 'Ошибка конфигурации сервера' });

  try {
    // 1. Параллельно получаем контакт и тариф
    const [contact, tarif] = await Promise.all([
      findContact(apiToken, telegram_id),
      getTarif(apiToken, telegram_id),
    ]);

    if (!contact) {
      return res.status(404).json({ error: 'Контакт не найден' });
    }

    if (!tarif || (tarif !== '490' && tarif !== '1190')) {
      return res.status(200).json({
        success: true,
        data: { tarif: tarif || null, currentStatus: 'expired', daysLeft: 0, currentWindow: 0, totalWindows: 0, windows: [], contact_id: contact.id || null },
      });
    }

    const vars = extractVariables(contact);
    const { датаНачала, датаОКОНЧАНИЯ } = vars;

    if (!датаНачала || !датаОКОНЧАНИЯ) {
      return res.status(200).json({
        success: true,
        data: { tarif, currentStatus: 'expired', daysLeft: 0, currentWindow: 0, totalWindows: 0, windows: [], contact_id: contact.id || null },
      });
    }

    const windowDays = tarif === '1190' ? 30 : 15;
    const contactId = contact.id || null;

    // 2. Попробовать прочитать из Blob
    let stored = await readGiftWindows(telegram_id);

    // 3. Проверить, нужно ли пересоздать (нет данных или даты изменились)
    const needRebuild = !stored ||
      stored.startDate !== датаНачала ||
      stored.endDate !== датаОКОНЧАНИЯ ||
      stored.tarif !== tarif;

    if (needRebuild) {
      const newWindows = buildWindows(датаНачала, датаОКОНЧАНИЯ, windowDays);
      const mergedWindows = stored ? mergeClaimedWindows(newWindows, stored.windows) : newWindows;

      stored = {
        telegram_id: String(telegram_id),
        contact_id: contactId,
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

    // 4. Вычислить статус
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
        contact_id: contactId,
      },
    });
  } catch (error) {
    console.error('get-gift-windows error:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
