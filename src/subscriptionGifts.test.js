import { getOrderGiftSource, isSubscriptionGiftItem } from './utils/subscriptionGifts';

test('recognizes catalog gifts as subscription gifts', () => {
  const item = {
    product: {
      gift: true,
      category: 'gift-sets',
    },
  };

  expect(isSubscriptionGiftItem(item)).toBe(true);
  expect(getOrderGiftSource(item)).toBe('subscription');
});

test('does not treat promo gifts as subscription gifts', () => {
  const item = {
    giftSource: 'promo:promo-2905',
    product: {
      gift: true,
      category: 'gift-sets',
    },
  };

  expect(isSubscriptionGiftItem(item)).toBe(false);
  expect(getOrderGiftSource(item)).toBe('promo:promo-2905');
});

test('does not treat threshold gifts as subscription gifts', () => {
  const item = {
    giftSource: 'threshold:threshold-2500',
    product: {
      gift: true,
      category: 'gift-rolls',
    },
  };

  expect(isSubscriptionGiftItem(item)).toBe(false);
  expect(getOrderGiftSource(item)).toBe('threshold:threshold-2500');
});
