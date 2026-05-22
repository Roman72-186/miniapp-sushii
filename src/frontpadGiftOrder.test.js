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
    comment: 'Промокод 102030',
  });

  expect(result.success).toBe(true);
  expect(global.fetch).toHaveBeenCalledTimes(1);

  const params = frontpadCalls[0].params;
  expect(params.get('product[0]')).toBe('BASE-ROLL-2100');
  expect(params.get('product_kol[0]')).toBe('1');
  expect(params.get('product_price[0]')).toBe('2100');
  expect(params.get('product[1]')).toBe('PROMO-GIFT-ROLL');
  expect(params.get('product_kol[1]')).toBe('1');
  expect(params.get('product_price[1]')).toBe('0');
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
