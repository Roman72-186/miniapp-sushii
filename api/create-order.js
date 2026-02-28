// api/create-order.js — Endpoint для создания заказа (WATBOT phone lookup + Frontpad + Telegram)
// Vercel Serverless Function (CommonJS)

const { createOrder } = require('./frontpad');

function parseJsonBody(req) {
  try {
    if (!req.body) return {};
    if (typeof req.body === "string") return JSON.parse(req.body);
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8"));
    if (typeof req.body === "object") return req.body;
    return {};
  } catch (e) {
    return {};
  }
}

/**
 * Получает телефон пользователя из WATBOT CRM по Telegram ID
 */
async function getPhoneByTelegramId(telegramId) {
  const apiToken = process.env.WATBOT_API_TOKEN;
  if (!apiToken || !telegramId) return null;

  try {
    const response = await fetch(
      `https://watbot.ru/api/v1/getListItems?api_token=${apiToken}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schema_id: '69a16dc23dd8ee76a202a802',
          filters: { id_tg: String(telegramId) },
        }),
      }
    );

    if (!response.ok) {
      console.error('WATBOT phone lookup error:', response.status);
      return null;
    }

    const data = await response.json();
    const items = data.data || [];

    if (items.length === 0) return null;

    // Поле telefon в записи пользователя
    const item = items[0];
    return item.telefon || item.phone || item.Telefon || null;
  } catch (err) {
    console.error('WATBOT phone lookup failed:', err.message);
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const body = parseJsonBody(req);
    const { products, client, payment, comment, delivery_type, affiliate, datetime, telegram_id } = body;

    // Валидация
    if (!products || !products.length) {
      return res.status(400).json({ success: false, error: 'Корзина пуста' });
    }
    if (!client || !client.name) {
      return res.status(400).json({ success: false, error: 'Укажите имя' });
    }

    // 1. Получаем телефон из WATBOT по telegram_id (привязка заказа в Frontpad по телефону)
    let orderPhone = client.phone || '';
    if (telegram_id) {
      const watbotPhone = await getPhoneByTelegramId(telegram_id);
      if (watbotPhone) {
        orderPhone = watbotPhone;
      }
    }

    if (!orderPhone) {
      return res.status(400).json({ success: false, error: 'Не удалось определить телефон' });
    }

    // 2. Создаём заказ в Frontpad
    const orderResult = await createOrder({
      products: products.map(p => ({
        id: p.id,
        quantity: p.quantity,
        price: p.price,
      })),
      client: {
        name: client.name,
        phone: orderPhone,
        street: client.street || '',
        home: client.home || '',
        apart: client.apart || '',
        pod: client.pod || '',
        et: client.et || '',
      },
      payment: payment || 'cash',
      affiliate: affiliate || '',
      datetime: datetime || '',
      comment: [
        comment || '',
        delivery_type === 'pickup' ? '[Самовывоз]' : '[Доставка]',
        payment === 'card' ? '[Оплата картой]' : '[Оплата наличными]',
      ].filter(Boolean).join(' | '),
    });

    if (!orderResult.success) {
      return res.status(500).json({
        success: false,
        error: orderResult.error?.message || 'Ошибка создания заказа в Frontpad',
      });
    }

    return res.status(200).json({
      success: true,
      orderId: orderResult.data.orderId,
      orderNumber: orderResult.data.orderNumber,
    });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({
      success: false,
      error: 'Не удалось создать заказ',
    });
  }
};
