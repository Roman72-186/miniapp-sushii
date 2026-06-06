const fs = require('fs');
const path = require('path');
const { validateSubscriptionGifts } = require('../api/_lib/subscription-gift-access');

function firstEnabledSku(relativePath) {
  const catalogPath = path.join(process.cwd(), 'public', relativePath);
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const item = (catalog.items || []).find(entry => entry.enabled !== false && entry.sku);
  if (!item) throw new Error(`No enabled SKU in ${relativePath}`);
  return item.sku;
}

const rollSku = firstEnabledSku(path.join('подписка 490', 'rolls-490.json'));
const setSku = firstEnabledSku(path.join('подписка 490', 'sets-490.json'));

test('сервер разрешает тарифу 1190 только подарочный сет', () => {
  expect(validateSubscriptionGifts([
    { sku: setSku, gift_source: 'subscription', gift_type: 'set' },
  ], { tariff: '1190' }).ok).toBe(true);

  expect(validateSubscriptionGifts([
    { sku: rollSku, gift_source: 'subscription', gift_type: 'roll' },
  ], { tariff: '1190' })).toMatchObject({
    ok: false,
    error: 'Для вашего тарифа доступен только подарочный сет',
  });
});

test('сервер разрешает тарифу 490 только подарочный ролл', () => {
  expect(validateSubscriptionGifts([
    { sku: rollSku, gift_source: 'subscription', gift_type: 'roll' },
  ], { tariff: '490' }).ok).toBe(true);

  expect(validateSubscriptionGifts([
    { sku: setSku, gift_source: 'subscription', gift_type: 'set' },
  ], { tariff: '490' })).toMatchObject({
    ok: false,
    error: 'Для вашего тарифа доступен только подарочный ролл',
  });
});
