import { syncCartGifts } from './utils/cartGifts';

const baseCart = [
  { product: { id: 'paid-1', price: 2600 }, quantity: 1 },
];

test('добавляет подарок по настраиваемому промокоду и порогу', () => {
  const result = syncCartGifts({
    items: baseCart,
    promoCode: 'summer',
    promoRules: [{
      id: 'promo-1',
      type: 'promo',
      code: 'SUMMER',
      threshold: 1500,
      enabled: true,
      product: { sku: 'GIFT-1', name: 'Подарок 1' },
    }],
    thresholdRules: [],
  });

  expect(result.toAdd).toHaveLength(1);
  expect(result.toAdd[0].giftSource).toBe('promo:promo-1');
});

test('добавляет несколько подарков по одному промокоду', () => {
  const result = syncCartGifts({
    items: baseCart,
    promoCode: 'summer',
    promoRules: [
      {
        id: 'promo-1',
        type: 'promo',
        code: 'SUMMER',
        threshold: 1500,
        enabled: true,
        product: { sku: 'GIFT-1', name: 'Подарок 1' },
      },
      {
        id: 'promo-2',
        type: 'promo',
        code: 'SUMMER',
        threshold: 1500,
        enabled: true,
        product: { sku: 'GIFT-2', name: 'Подарок 2' },
      },
    ],
    thresholdRules: [],
  });

  expect(result.toAdd.map(item => item.giftSource)).toEqual([
    'promo:promo-1',
    'promo:promo-2',
  ]);
});

test('добавляет подарки по нескольким достигнутым порогам', () => {
  const result = syncCartGifts({
    items: baseCart,
    promoCode: '',
    promoRules: [],
    thresholdRules: [
      {
        id: 'threshold-1500',
        type: 'threshold',
        threshold: 1500,
        enabled: true,
        product: { sku: 'GIFT-1500', name: 'Подарок 1500' },
      },
      {
        id: 'threshold-2500',
        type: 'threshold',
        threshold: 2500,
        enabled: true,
        product: { sku: 'GIFT-2500', name: 'Подарок 2500' },
      },
    ],
  });

  expect(result.toAdd.map(item => item.giftSource)).toEqual([
    'threshold:threshold-1500',
    'threshold:threshold-2500',
  ]);
});
