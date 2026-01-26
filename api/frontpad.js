// api/frontpad.js — Клиент Frontpad API
// Vercel Serverless Function (CommonJS)

const FRONTPAD_API = 'https://app.frontpad.ru/api/index.php';
const FRONTPAD_SECRET = process.env.FRONTPAD_SECRET;

/**
 * Отправляет запрос к Frontpad API
 * @param {string} method - Метод API (get_products, get_client, new_order, etc.)
 * @param {Object} params - Дополнительные параметры
 * @returns {Promise<Object>} - Ответ API
 */
async function frontpadRequest(method, params = {}) {
  if (!FRONTPAD_SECRET) {
    throw new Error('FRONTPAD_SECRET не настроен в переменных окружения');
  }

  const body = new URLSearchParams({
    secret: FRONTPAD_SECRET,
    ...params
  });

  const response = await fetch(`${FRONTPAD_API}?${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString()
  });

  const data = await response.json();

  if (data.result === 'error') {
    const errorMessages = {
      'invalid_secret': 'Неверный секретный ключ Frontpad',
      'requests_limit': 'Превышен лимит запросов (30/мин)',
      'api_off': 'API Frontpad выключен',
      'invalid_plant': 'API недоступен на текущем тарифе',
      'invalidclientphone': 'Неверный формат номера телефона',
    };
    throw new Error(errorMessages[data.error] || `Frontpad API: ${data.error}`);
  }

  return data;
}

/**
 * Получает список всех товаров из Frontpad
 * @returns {Promise<Array>} - Массив товаров
 */
async function getProducts() {
  const data = await frontpadRequest('get_products');

  // Преобразуем параллельные массивы в массив объектов
  const products = [];
  const ids = data.product_id || [];
  const names = data.name || [];
  const prices = data.price || [];
  const sales = data.sale || [];

  for (let i = 0; i < ids.length; i++) {
    products.push({
      id: ids[i],
      name: names[i] || '',
      price: parseFloat(prices[i]) || 0,
      hasSale: sales[i] === '1' || sales[i] === 1,
    });
  }

  return products;
}

/**
 * Получает информацию о клиенте по номеру телефона
 * @param {string} phone - Номер телефона
 * @returns {Promise<Object>} - Данные клиента
 */
async function getClient(phone) {
  // Нормализуем телефон - только цифры
  const normalizedPhone = phone.replace(/[^\d]/g, '');

  const data = await frontpadRequest('get_client', {
    client_phone: normalizedPhone
  });

  return {
    found: data.result === 'success',
    name: data.name || '',
    sale: parseFloat(data.sale) || 0,
    score: parseFloat(data.score) || 0,
    address: {
      street: data.street || '',
      home: data.home || '',
      pod: data.pod || '',
      et: data.et || '',
      apart: data.apart || '',
    },
    email: data.email || '',
    descr: data.descr || '',
    card: data.card || '',
  };
}

/**
 * Отправляет новый заказ в Frontpad
 * @param {Object} orderData - Данные заказа
 * @returns {Promise<Object>} - Результат создания заказа
 */
async function createOrder(orderData) {
  const {
    products, // [{ id, quantity, modifiers? }]
    client,   // { name, phone, street?, home?, apart?, pod?, et? }
    payment,  // 'cash' | 'card' | 'online'
    comment,
    datetime, // Время предзаказа (опционально)
  } = orderData;

  const params = {
    name: client.name || '',
    phone: client.phone,
    street: client.street || '',
    home: client.home || '',
    apart: client.apart || '',
    pod: client.pod || '',
    et: client.et || '',
    descr: comment || '',
  };

  // Добавляем товары
  products.forEach((product, index) => {
    params[`product[${index}]`] = product.id;
    params[`product_kol[${index}]`] = product.quantity || 1;
    if (product.modifiers) {
      params[`product_mod[${index}]`] = product.modifiers;
    }
  });

  // Время предзаказа
  if (datetime) {
    params.datetime = datetime;
  }

  const data = await frontpadRequest('new_order', params);

  return {
    success: data.result === 'success',
    orderId: data.order_id,
    orderNumber: data.order_number,
  };
}

module.exports = {
  frontpadRequest,
  getProducts,
  getClient,
  createOrder,
};
