const { appendEligibleOrderGifts } = require('../api/_lib/order-gifts');

function rulesProvider() {
  return {
    promoRules: [
      {
        id: 'promo-102030',
        type: 'promo',
        code: '102030',
        threshold: 2000,
        enabled: true,
        product: { sku: 'PROMO-GIFT-ROLL', name: 'Промо ролл' },
      },
    ],
    thresholdRules: [
      {
        id: 'threshold-2500',
        type: 'threshold',
        threshold: 2500,
        enabled: true,
        product: { sku: 'THRESHOLD-GIFT-ROLL', name: 'Ролл за чек' },
      },
    ],
  };
}

test('сервер добавляет подарок по промокоду в заказ для Frontpad', () => {
  const products = appendEligibleOrderGifts([
    { id: 'BASE-ROLL', sku: 'BASE-ROLL', name: 'Платный ролл', price: 2100, quantity: 1 },
  ], '102030', rulesProvider);

  expect(products).toHaveLength(2);
  expect(products[1]).toMatchObject({
    id: 'PROMO-GIFT-ROLL',
    sku: 'PROMO-GIFT-ROLL',
    price: 0,
    quantity: 1,
    gift_source: 'promo:promo-102030',
  });
});

test('сервер добавляет несколько подарков по одному промокоду в заказ для Frontpad', () => {
  const products = appendEligibleOrderGifts([
    { id: 'BASE-ROLL', sku: 'BASE-ROLL', name: 'Платный ролл', price: 2100, quantity: 1 },
  ], '102030', () => ({
    promoRules: [
      {
        id: 'promo-102030-1',
        type: 'promo',
        code: '102030',
        threshold: 2000,
        enabled: true,
        product: { sku: 'PROMO-GIFT-ROLL-1', name: 'Промо ролл 1' },
      },
      {
        id: 'promo-102030-2',
        type: 'promo',
        code: '102030',
        threshold: 2000,
        enabled: true,
        product: { sku: 'PROMO-GIFT-ROLL-2', name: 'Промо ролл 2' },
      },
    ],
    thresholdRules: [],
  }));

  expect(products.map(product => product.gift_source).filter(Boolean)).toEqual([
    'promo:promo-102030-1',
    'promo:promo-102030-2',
  ]);
});

test('сервер добавляет подарок за порог чека в заказ для Frontpad', () => {
  const products = appendEligibleOrderGifts([
    { id: 'SET-2600', sku: 'SET-2600', name: 'Сет', price: 2600, quantity: 1 },
  ], '', rulesProvider);

  expect(products).toHaveLength(2);
  expect(products[1]).toMatchObject({
    id: 'THRESHOLD-GIFT-ROLL',
    sku: 'THRESHOLD-GIFT-ROLL',
    price: 0,
    quantity: 1,
    gift_source: 'threshold:threshold-2500',
  });
});

test('сервер не дублирует подарок, если фронт уже передал его в заказе', () => {
  const products = appendEligibleOrderGifts([
    { id: 'SET-2600', sku: 'SET-2600', name: 'Сет', price: 2600, quantity: 1 },
    {
      id: 'THRESHOLD-GIFT-ROLL',
      sku: 'THRESHOLD-GIFT-ROLL',
      name: 'Ролл за чек',
      price: 0,
      quantity: 1,
      gift_source: 'threshold:threshold-2500',
    },
  ], '', rulesProvider);

  expect(products).toHaveLength(2);
  expect(products.filter(product => product.sku === 'THRESHOLD-GIFT-ROLL')).toHaveLength(1);
});
