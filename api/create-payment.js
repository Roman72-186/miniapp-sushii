// api/create-payment.js — Создание платежа в YooKassa (первый платёж + сохранение карты)
// Vercel Serverless Function (CommonJS)

const crypto = require('crypto');
const { getPriceTable } = require('./admin-pricing');
const { getUser, upsertUser } = require('./_lib/db');

const VALID_TARIFS = ['290', '490', '1190', '9990'];
const VALID_MONTHS = [1, 3, 5];

function normalizePhone(raw) {
  const nums = String(raw || '').replace(/\D/g, '');
  if (nums.length === 11 && nums.startsWith('8')) return '7' + nums.slice(1);
  if (nums.length === 11 && nums.startsWith('7')) return nums;
  if (nums.length === 10) return '7' + nums;
  return nums;
}

function buildGuestUserId(phone) {
  return `web_${phone}_${crypto.randomUUID().slice(0, 8)}`;
}

function isAutoRenewDisabled(user) {
  return user?.auto_renew_disabled === true || user?.auto_renew_disabled === 1 || user?.auto_renew_disabled === '1';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { telegram_id, tarif, months, phone: reqPhone, name: reqName } = req.body || {};

  if (!tarif || !VALID_TARIFS.includes(String(tarif))) {
    return res.status(400).json({ error: 'Некорректный тариф' });
  }
  const isOneTime = String(tarif) === '9990';
  const monthsNum = isOneTime ? 1 : (Number(months) || 1);
  if (!isOneTime && !VALID_MONTHS.includes(monthsNum)) {
    return res.status(400).json({ error: 'Некорректный срок. Допустимые: 1, 3, 5 месяцев' });
  }

  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    return res.status(500).json({ error: 'Ошибка конфигурации платёжной системы' });
  }

  const tarifStr = String(tarif);
  const PRICE_TABLE = getPriceTable();
  const totalAmount = PRICE_TABLE[tarifStr]?.[monthsNum];
  if (!totalAmount) {
    return res.status(400).json({ error: 'Не найдена цена для тарифа' });
  }
  const amount = totalAmount.toFixed(2);

  let paymentUserId = telegram_id ? String(telegram_id) : null;
  let dbUser = paymentUserId ? await getUser(paymentUserId) : null;
  let userPhone = null;

  if (!paymentUserId) {
    const guestPhone = normalizePhone(reqPhone);
    const guestName = String(reqName || '').trim();

    if (!guestName) {
      return res.status(400).json({ error: 'Укажите имя' });
    }
    if (!/^7\d{10}$/.test(guestPhone)) {
      return res.status(400).json({ error: 'Некорректный номер телефона. Формат: +7XXXXXXXXXX' });
    }

    const { getUserByPhone } = require('./_lib/db');
    dbUser = await getUserByPhone(guestPhone);
    if (dbUser) {
      paymentUserId = String(dbUser.telegram_id);
      if (guestName && guestName !== dbUser.name) {
        await upsertUser({ telegram_id: paymentUserId, name: guestName, phone: guestPhone });
        dbUser = await getUser(paymentUserId);
      }
    } else {
      paymentUserId = buildGuestUserId(guestPhone);
      await upsertUser({ telegram_id: paymentUserId, name: guestName, phone: guestPhone });
      dbUser = await getUser(paymentUserId);
    }
    userPhone = guestPhone;
  }

  const returnUrl = isOneTime
    ? `https://sushi-house-39.ru/discount-shop?telegram_id=${encodeURIComponent(paymentUserId)}&payment=success`
    : (telegram_id
      ? `https://sushi-house-39.ru/partner-code?telegram_id=${encodeURIComponent(paymentUserId)}`
      : `https://sushi-house-39.ru/complete-registration?telegram_id=${encodeURIComponent(paymentUserId)}&payment=success`);

  const monthsLabel = monthsNum === 1 ? '1 мес' : `${monthsNum} мес`;
  const description = isOneTime
    ? `Амбассадор Суши-Хаус 39 (${tarifStr}\u20BD)`
    : `Подписка Суши-Хаус 39 (${tarifStr}\u20BD \u00D7 ${monthsLabel})`;

  // Телефон пользователя для чека (54-ФЗ)
  const rawPhone = reqPhone || dbUser?.phone || null;
  if (!userPhone) userPhone = normalizePhone(rawPhone);
  if (!/^7\d{10}$/.test(userPhone)) userPhone = null;

  // Сохраняем нормализованный телефон в БД (7XXXXXXXXXX)
  if (userPhone && (!dbUser?.phone || dbUser.phone !== userPhone)) {
    await upsertUser({ telegram_id: String(paymentUserId), phone: userPhone });
  }

  const body = {
    amount: {
      value: amount,
      currency: 'RUB',
    },
    confirmation: {
      type: 'redirect',
      return_url: returnUrl,
    },
    capture: true,
    description,
    receipt: {
      customer: userPhone
        ? { phone: `+${userPhone}` }
        : { email: 'order@sushi-house-39.ru' },
      items: [
        {
          description,
          quantity: '1.00',
          amount: { value: amount, currency: 'RUB' },
          vat_code: 1,
          payment_subject: 'service',
          payment_mode: 'full_payment',
        },
      ],
    },
    metadata: {
      telegram_id: String(paymentUserId),
      tarif: tarifStr,
      months: String(monthsNum),
    },
  };

  // Сохраняем метод оплаты только для подписок, если пользователь не отключил автосписание.
  if (!isOneTime && !isAutoRenewDisabled(dbUser)) {
    body.save_payment_method = true;
  }

  try {
    const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    const idempotenceKey = crypto.randomUUID();

    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Idempotence-Key': idempotenceKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('YooKassa create payment error:', response.status, errText);
      return res.status(502).json({ error: 'Ошибка создания платежа' });
    }

    const data = await response.json();
    const confirmationUrl = data.confirmation?.confirmation_url;

    if (!confirmationUrl) {
      console.error('YooKassa: no confirmation_url in response', JSON.stringify(data));
      return res.status(502).json({ error: 'Не получена ссылка для оплаты' });
    }

    return res.status(200).json({ confirmation_url: confirmationUrl });
  } catch (error) {
    console.error('create-payment error:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
