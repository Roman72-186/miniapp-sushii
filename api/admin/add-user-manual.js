// POST /api/admin/add-user-manual
// Добавление или обновление пользователя через админку

const { checkAuth } = require('../_lib/admin-auth');
const { getUserByPhone, getUser, upsertUser } = require('../_lib/db');
const { readGiftWindows, writeGiftWindows } = require('../_lib/blob-store');
const { formatDDMMYYYY, addDays, todayUTC } = require('../_lib/gift-windows');

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return '7' + digits;
  if (digits.length === 11 && digits[0] === '8') return '7' + digits.slice(1);
  return digits;
}

function formatDate(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}.${m}.${date.getFullYear()}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });
  if (!checkAuth(req, res)) return;

  const { name, phone, tariff, months, end_date, gift_rolls, gift_sets } = req.body || {};

  if (!phone) return res.status(400).json({ error: 'Номер телефона обязателен' });
  if (!tariff) return res.status(400).json({ error: 'Тариф обязателен' });
  if (!end_date && (!months || Number(months) < 1)) {
    return res.status(400).json({ error: 'Укажите дату окончания подписки' });
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone || normalizedPhone.length < 10) {
    return res.status(400).json({ error: 'Неверный формат телефона' });
  }

  const today = new Date();
  const subscription_start = formatDate(today);
  let subscription_end;

  if (end_date) {
    // YYYY-MM-DD из HTML date input
    const d = new Date(end_date + 'T00:00:00');
    subscription_end = formatDate(d);
  } else {
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + Number(months));
    subscription_end = formatDate(endDate);
  }

  try {
    const existingUser = await getUserByPhone(normalizedPhone);
    const telegram_id = existingUser
      ? existingUser.telegram_id
      : 'web_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    const isNew = !existingUser;

    const finalName = (name && name.trim()) || existingUser?.name || `Клиент ${normalizedPhone}`;

    await upsertUser({
      telegram_id,
      name: finalName,
      phone: normalizedPhone,
      tariff: String(tariff),
      subscription_status: 'активно',
      subscription_start,
      subscription_end,
    });

    const user = await getUser(telegram_id);

    // Выдача подарков
    let gifts_granted = 0;
    const rollsCount = Math.min(Math.max(Number(gift_rolls) || 0, 0), 50);
    const setsCount  = Math.min(Math.max(Number(gift_sets)  || 0, 0), 50);

    const grantGift = async (type) => {
      const days = type === 'set' ? 30 : 15;
      const today = todayUTC();
      const end   = addDays(today, days);
      const newWindow = {
        num: 1,
        start: formatDDMMYYYY(today),
        end: formatDDMMYYYY(end),
        status: 'available',
        claimedAt: null,
        grantedBy: 'admin',
        grantType: type,
      };
      let stored = await readGiftWindows(telegram_id);
      if (stored && stored.windows && stored.windows.length > 0) {
        newWindow.num = Math.max(...stored.windows.map(w => w.num)) + 1;
        stored.windows.push(newWindow);
        stored.updatedAt = new Date().toISOString();
      } else {
        stored = {
          telegram_id: String(telegram_id),
          tarif: type === 'set' ? '1190' : '490',
          startDate: newWindow.start,
          endDate: newWindow.end,
          windowDays: days,
          totalWindows: 1,
          windows: [newWindow],
          updatedAt: new Date().toISOString(),
        };
      }
      stored.totalWindows = stored.windows.length;
      await writeGiftWindows(telegram_id, stored);
      gifts_granted++;
    };

    for (let i = 0; i < rollsCount; i++) await grantGift('roll');
    for (let i = 0; i < setsCount; i++)  await grantGift('set');

    return res.status(200).json({
      success: true,
      message: isNew ? 'Пользователь создан' : 'Подписка обновлена',
      gifts_granted,
      user: {
        telegram_id: user.telegram_id,
        name: user.name,
        phone: user.phone,
        tariff: user.tariff,
        subscription_status: user.subscription_status,
        subscription_start: user.subscription_start,
        subscription_end: user.subscription_end,
      },
    });
  } catch (error) {
    console.error('[admin/add-user-manual] Ошибка:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
