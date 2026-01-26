// /api/order.js  — Vercel Serverless Function (CommonJS)

const TELEGRAM_WEBHOOK_URL =
  "https://api.watbot.ru/hook/4302904:1NR5p7lPaeNS6PUNPFs4qZfqfynFcG6ZX0ff2evpL2hWo01Q";

// Импортируем функцию createOrder из api/frontpad.js
const { createOrder } = require('./frontpad');

// Универсальный парсер: Buffer | string | object -> object
function parseJsonBody(req) {
  try {
    if (!req.body) return {};
    if (typeof req.body === "string") return JSON.parse(req.body);
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8"));
    // Vercel может уже отдать объект, если content-type корректный
    if (typeof req.body === "object") return req.body;
    return {};
  } catch (e) {
    return {};
  }
}

module.exports = async (req, res) => {
  // Разрешаем только POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Метод не поддерживается" });
  }

  try {
    const { telegram_id, product_id, product_name, price, code } = parseJsonBody(req);

    // Мягкая валидация — вернём 400 с причинами, чтобы проще было отладить
    const missing = [];
    if (!telegram_id) missing.push("telegram_id");
    if (!product_id) missing.push("product_id");
    if (!product_name) missing.push("product_name");
    if (price === undefined || price === null) missing.push("price");

    if (missing.length) {
      return res.status(400).json({ error: `Поля отсутствуют: ${missing.join(", ")}` });
    }

    // Подготовим данные для заказа во Frontpad
    // Здесь мы предполагаем, что telegram_id может быть использован как имя клиента
    // и что у нас есть базовая информация о продукте и цене
    const orderData = {
      products: [{
        id: product_id, // ID товара из запроса
        quantity: 1,    // Предполагаем, что количество всегда 1, если не передано отдельно
        // modifiers: [] // Можно добавить модификаторы, если они есть
      }],
      client: {
        name: telegram_id?.toString() || 'Unknown Client', // Используем telegram_id как имя
        phone: '', // Нужно будет добавить телефон, если доступен
        street: '', // Адрес, если доступен
        home: '',
        apart: '',
        pod: '',
        et: '',
      },
      payment: 'online', // Предполагаем онлайн-оплату
      comment: `Telegram ID: ${telegram_id}, Code: ${code || 'N/A'}`, // Комментарий
      datetime: null, // Время предзаказа, если нужно
    };

    // Создаем заказ во Frontpad
    const frontpadResult = await createOrder(orderData);

    if (!frontpadResult.success) {
      console.error("Frontpad API error:", frontpadResult.error);
      return res.status(500).json({
        success: false,
        error: `Ошибка создания заказа во Frontpad: ${frontpadResult.error.message}`,
        errorCode: frontpadResult.error.code
      });
    }

    // Если заказ успешно создан во Frontpad, отправляем уведомление в Telegram
    const response = await fetch(TELEGRAM_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegram_id,
        product_id,
        product_name,
        price,
        code: code ?? ""
      })
    });

    const text = await response.text().catch(() => "");

    if (!response.ok) {
      console.error("Webhook error:", response.status, text);
      // Важно: заказ уже создан во Frontpad, но уведомление в Telegram не отправилось
      // Возможно, стоит попробовать повторить отправку уведомления
      return res.status(502).json({
        success: false,
        error: `Webhook ${response.status}${response.statusText ? " " + response.statusText : ""}`,
        body: text || null,
        warning: "Заказ успешно создан во Frontpad, но уведомление в Telegram не отправлено."
      });
    }

    return res.status(200).json({
      success: true,
      status: "ok",
      frontpadOrderId: frontpadResult.data.orderId, // Возвращаем ID заказа из Frontpad
      frontpadOrderNumber: frontpadResult.data.orderNumber // Возвращаем номер заказа из Frontpad
    });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Не удалось обработать заказ" });
  }
};
