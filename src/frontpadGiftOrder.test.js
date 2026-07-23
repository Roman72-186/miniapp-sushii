const originalFetch = global.fetch;
const originalFrontpadSecret = process.env.FRONTPAD_SECRET;

function loadFrontpadClient() {
  jest.resetModules();
  process.env.FRONTPAD_SECRET = 'test-frontpad-secret';
  return require('../api/_lib/frontpad');
}

function mockFrontpadSuccess() {
  const calls = [];

  global.fetch = jest.fn(async (url, options) => {
    calls.push({
      url,
      params: new URLSearchParams(options.body),
    });

    return {
      ok: true,
      json: async () => ({
        result: 'success',
        order_id: 'frontpad-order-id',
        order_number: '42',
      }),
    };
  });

  return calls;
}

afterEach(() => {
  global.fetch = originalFetch;
  if (originalFrontpadSecret === undefined) {
    delete process.env.FRONTPAD_SECRET;
  } else {
    process.env.FRONTPAD_SECRET = originalFrontpadSecret;
  }
  jest.resetModules();
});

test('показывает понятное сообщение, когда кассовая смена Frontpad закрыта', async () => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ result: 'error', error: 'cash_close' }),
  }));
  const { createOrder } = loadFrontpadClient();

  const result = await createOrder({
    products: [{ id: 'ROLL-1', quantity: 1, price: 500 }],
    client: { name: 'Тест', phone: '79999999999' },
    payment: 'cash',
  });

  expect(result).toEqual({
    success: false,
    error: {
      code: 'cash_close',
      message: 'Выбранный филиал сейчас не принимает заказы: кассовая смена закрыта. Попробуйте позже или свяжитесь с рестораном.',
    },
  });
});

test('отправляет во Frontpad корзину с подарком по промокоду с ценой 0', async () => {
  const frontpadCalls = mockFrontpadSuccess();
  const { createOrder } = loadFrontpadClient();

  const result = await createOrder({
    products: [
      { id: 'BASE-ROLL-2100', quantity: 1, price: 2100 },
      { id: 'PROMO-GIFT-ROLL', quantity: 1, price: 0 },
    ],
    client: { name: 'Тест Промокод', phone: '79999999999' },
    payment: 'cash',
    promoCode: '102030',
    comment: 'Промокод 102030',
  });

  expect(result.success).toBe(true);
  expect(global.fetch).toHaveBeenCalledTimes(1);

  const params = frontpadCalls[0].params;
  expect(params.get('descr')).toContain('PROMO: 102030');
  expect(params.get('product[0]')).toBe('BASE-ROLL-2100');
  expect(params.get('product_kol[0]')).toBe('1');
  expect(params.get('product_price[0]')).toBe('2100');
  expect(params.get('product[1]')).toBe('PROMO-GIFT-ROLL');
  expect(params.get('product_kol[1]')).toBe('1');
  expect(params.get('product_price[1]')).toBe('0');
});

test('sends paid promo and threshold items in one Frontpad product array', async () => {
  const frontpadCalls = mockFrontpadSuccess();
  const { createOrder } = loadFrontpadClient();

  const result = await createOrder({
    products: [
      { id: 'PAID-ROLL', quantity: 2, price: 450 },
      { id: 'PROMO-GIFT-ROLL', quantity: 1, price: 0 },
      { id: 'THRESHOLD-GIFT-ROLL', quantity: 1, price: 0 },
    ],
    client: { name: 'Test Mixed Order', phone: '79999999999' },
    payment: 'cash',
    promoCode: '102030',
    comment: 'Mixed order',
  });

  expect(result.success).toBe(true);
  expect(global.fetch).toHaveBeenCalledTimes(1);

  const params = frontpadCalls[0].params;
  expect(params.get('descr')).toContain('PROMO: 102030');
  expect(params.get('product[0]')).toBe('PAID-ROLL');
  expect(params.get('product_kol[0]')).toBe('2');
  expect(params.get('product_price[0]')).toBe('450');
  expect(params.get('product[1]')).toBe('PROMO-GIFT-ROLL');
  expect(params.get('product_kol[1]')).toBe('1');
  expect(params.get('product_price[1]')).toBe('0');
  expect(params.get('product[2]')).toBe('THRESHOLD-GIFT-ROLL');
  expect(params.get('product_kol[2]')).toBe('1');
  expect(params.get('product_price[2]')).toBe('0');
});

test('отправляет во Frontpad корзину с подарком за чек больше 2500 с ценой 0', async () => {
  const frontpadCalls = mockFrontpadSuccess();
  const { createOrder } = loadFrontpadClient();

  const result = await createOrder({
    products: [
      { id: 'SET-2600', quantity: 1, price: 2600 },
      { id: 'THRESHOLD-GIFT-ROLL', quantity: 1, price: 0 },
    ],
    client: { name: 'Тест Порог', phone: '79999999999' },
    payment: 'cash',
    comment: 'Подарок за чек от 2500',
  });

  expect(result.success).toBe(true);
  expect(global.fetch).toHaveBeenCalledTimes(1);

  const params = frontpadCalls[0].params;
  expect(params.get('product[0]')).toBe('SET-2600');
  expect(params.get('product_kol[0]')).toBe('1');
  expect(params.get('product_price[0]')).toBe('2600');
  expect(params.get('product[1]')).toBe('THRESHOLD-GIFT-ROLL');
  expect(params.get('product_kol[1]')).toBe('1');
  expect(params.get('product_price[1]')).toBe('0');
});
