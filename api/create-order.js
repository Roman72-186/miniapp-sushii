// api/create-order.js — Endpoint для создания заказа (Frontpad + Telegram)
// Vercel Serverless Function (CommonJS)

const { createOrder } = require('./frontpad');

const TELEGRAM_WEBHOOK_URL =
  "https://api.watbot.ru/hook/3679113:lNF976LZ8w7ok2w4LHOuxt1X9YqVNGKxbBFbi8uGlUCTyLV3";

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
    const { products, client, payment, comment, delivery_type, telegram_id } = body;

    // Валидация
    if (!products || !products.length) {
      return res.status(400).json({ success: false, error: 'Корзина пуста' });
    }
    if (!client || !client.phone) {
      return res.status(400).json({ success: false, error: 'Укажите номер телефона' });
    }
    if (!client.name) {
      return res.status(400).json({ success: false, error: 'Укажите имя' });
    }

    // 1. Создаём заказ в Frontpad
    const orderResult = await createOrder({
      products: products.map(p => ({ id: p.id, quantity: p.quantity })),
      client: {
        name: client.name,
        phone: client.phone,
        street: client.street || '',
        home: client.home || '',
        apart: client.apart || '',
        pod: client.pod || '',
        et: client.et || '',
      },
      payment: payment || 'cash',
      comment: [
        comment || '',
        delivery_type === 'pickup' ? '[Самовывоз]' : '[Доставка]',
        payment === 'card' ? '[Оплата картой]' : '[Оплата наличными]',
      ].filter(Boolean).join(' | '),
    });

    // 2. Отправляем уведомление в Telegram (не блокируем ответ при ошибке)
    const totalSum = products.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 1), 0);
    const itemsList = products.map(p => `${p.name} x${p.quantity}`).join(', ');

    try {
      await fetch(TELEGRAM_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: telegram_id || '',
          product_name: `Заказ из магазина: ${itemsList}`,
          price: totalSum,
          product_id: orderResult.success ? orderResult.data?.orderId : '',
          code: [
            `Клиент: ${client.name}, ${client.phone}`,
            delivery_type === 'pickup' ? 'Самовывоз' : `Доставка: ${client.street || ''} ${client.home || ''} кв.${client.apart || ''}`,
            payment === 'card' ? 'Оплата картой' : 'Оплата наличными',
            comment ? `Комментарий: ${comment}` : '',
          ].filter(Boolean).join('\n'),
        }),
      });
    } catch (tgErr) {
      console.error('Telegram notification error:', tgErr);
    }

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
