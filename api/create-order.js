// api/create-order.js — Endpoint для создания заказа (SQLite phone lookup + Frontpad + Telegram)

const { createOrder } = require('./_lib/frontpad');
const { readUserCache } = require('./_lib/user-cache');
const { getUser } = require('./_lib/db');

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

    // 1. Получаем телефон: из формы → кэш → SQLite
    let orderPhone = client.phone || '';
    if (telegram_id) {
      const cache = await readUserCache(telegram_id);
      const cachedPhone = cache?.listItem?.telefon;
      if (cachedPhone) {
        orderPhone = cachedPhone;
      } else {
        const dbUser = getUser(telegram_id);
        if (dbUser?.phone) {
          orderPhone = dbUser.phone;
        }
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
