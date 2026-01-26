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
/**
 * Отправляет запрос к Frontpad API
 * @param {string} method - Метод API (get_products, get_client, new_order, etc.)
 * @param {Object} params - Дополнительные параметры
 * @returns {Promise<{success: boolean, data?: Object, error?: {code: string, message: string}}>} - Результат API
 */
async function frontpadRequest(method, params = {}) {
  if (!FRONTPAD_SECRET) {
    return {
      success: false,
      error: {
        code: 'MISSING_SECRET',
        message: 'FRONTPAD_SECRET не настроен в переменных окружения'
      }
    };
  }

  const body = new URLSearchParams({
    secret: FRONTPAD_SECRET,
    ...params
  });

  try {
    const response = await fetch(`${FRONTPAD_API}?${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString()
    });

    // Проверяем, был ли запрос успешным (статус 2xx)
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`
        }
      };
    }

    const data = await response.json();

    if (data.result === 'error') {
      const errorMessages = {
        'invalid_secret': 'Неверный секретный ключ Frontpad',
        'requests_limit': 'Превышен лимит запросов (30/мин)',
        'api_off': 'API Frontpad выключен',
        'invalid_plant': 'API недоступен на текущем тарифе',
        'invalidclientphone': 'Неверный формат номера телефона',
      };
      return {
        success: false,
        error: {
          code: data.error,
          message: errorMessages[data.error] || `Frontpad API: ${data.error}`
        }
      };
    }

    return {
      success: true,
      data: data
    };
  } catch (networkError) {
    // Обработка сетевых ошибок (например, нет соединения, таймаут)
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: `Ошибка сети при обращении к Frontpad API: ${networkError.message}`
      }
    };
  }
}

/**
 * Получает список всех товаров из Frontpad
 * @returns {Promise<{success: boolean, data?: Array, error?: {code: string, message: string}}>} - Результат операции
 */
async function getProducts() {
  const result = await frontpadRequest('get_products');

  if (!result.success) {
    return result; // Возвращаем ошибку напрямую
  }

  // Преобразуем параллельные массивы в массив объектов
  const products = [];
  const ids = result.data.product_id || [];
  const names = result.data.name || [];
  const prices = result.data.price || [];
  const sales = result.data.sale || [];

  for (let i = 0; i < ids.length; i++) {
    products.push({
      id: ids[i],
      name: names[i] || '',
      price: parseFloat(prices[i]) || 0,
      hasSale: sales[i] === '1' || sales[i] === 1,
    });
  }

  return {
    success: true,
    data: products
  };
}

/**
 * Получает информацию о клиенте по номеру телефона
 * @param {string} phone - Номер телефона
 * @returns {Promise<{success: boolean, data?: Object, error?: {code: string, message: string}}>} - Результат операции
 */
async function getClient(phone) {
  // Нормализуем телефон - только цифры
  const normalizedPhone = phone.replace(/[^\d]/g, '');

  const result = await frontpadRequest('get_client', {
    client_phone: normalizedPhone
  });

  if (!result.success) {
    return result; // Возвращаем ошибку напрямую
  }

  return {
    success: true,
    data: {
      found: true, // Успешный результат от API означает, что клиент найден
      name: result.data.name || '',
      sale: parseFloat(result.data.sale) || 0,
      score: parseFloat(result.data.score) || 0,
      address: {
        street: result.data.street || '',
        home: result.data.home || '',
        pod: result.data.pod || '',
        et: result.data.et || '',
        apart: result.data.apart || '',
      },
      email: result.data.email || '',
      descr: result.data.descr || '',
      card: result.data.card || '',
    }
  };
}

/**
 * Отправляет новый заказ в Frontpad
 * @param {Object} orderData - Данные заказа
 * @returns {Promise<{success: boolean, data?: Object, error?: {code: string, message: string}}>} - Результат операции
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

  const result = await frontpadRequest('new_order', params);

  if (!result.success) {
    return result; // Возвращаем ошибку напрямую
  }

  return {
    success: true,
    data: {
      orderId: result.data.order_id,
      orderNumber: result.data.order_number,
    }
  };
}

module.exports = {
  frontpadRequest,
  getProducts,
  getClient,
  createOrder,
};
