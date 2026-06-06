const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const GIFT_CATALOGS = {
  roll: 'подписка 490/rolls-490.json',
  set: 'подписка 490/sets-490.json',
};

const TARIFF_GIFT_TYPE = {
  '490': 'roll',
  '1190': 'set',
  '9990': 'set',
};

function readCatalog(relativePath) {
  const dataPath = path.join(ROOT, 'data', 'products', relativePath);
  const publicPath = path.join(ROOT, 'public', relativePath);
  const filePath = fs.existsSync(dataPath) ? dataPath : publicPath;

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return { items: [] };
  }
}

function catalogSkuSet(type) {
  const relativePath = GIFT_CATALOGS[type];
  if (!relativePath) return new Set();

  const catalog = readCatalog(relativePath);
  return new Set(
    (catalog.items || [])
      .filter(item => item && item.enabled !== false)
      .map(item => String(item.sku || item.id || '').trim())
      .filter(Boolean)
  );
}

function getProductSku(product) {
  return String(
    product?.sku ||
    product?.frontpad_id ||
    product?.frontpadId ||
    product?.product_id ||
    product?.id ||
    ''
  ).trim();
}

function normalizeGiftType(product) {
  const explicit = String(product?.gift_type || product?.giftType || '').trim();
  if (explicit === 'roll' || explicit === 'set') return explicit;

  const category = String(product?.gift_category || product?.giftCategory || product?.category || '').trim();
  if (category === 'gift-rolls') return 'roll';
  if (category === 'gift-sets') return 'set';

  const sku = getProductSku(product);
  if (!sku) return null;
  if (catalogSkuSet('roll').has(sku)) return 'roll';
  if (catalogSkuSet('set').has(sku)) return 'set';
  return null;
}

function isSubscriptionGift(product) {
  const source = String(product?.gift_source || product?.giftSource || '').trim();
  return source === 'subscription';
}

function validateSubscriptionGifts(products, user) {
  const subscriptionGifts = (products || []).filter(isSubscriptionGift);
  if (subscriptionGifts.length === 0) return { ok: true };

  if (subscriptionGifts.length > 1) {
    return { ok: false, error: 'Можно выбрать только один подарок по подписке' };
  }

  const tariff = String(user?.tariff || '');
  const allowedType = TARIFF_GIFT_TYPE[tariff];
  if (!allowedType) {
    return { ok: false, error: 'Подарок недоступен для вашего тарифа' };
  }

  const gift = subscriptionGifts[0];
  const giftType = normalizeGiftType(gift);
  if (!giftType) {
    return { ok: false, error: 'Не удалось определить тип подарка по подписке' };
  }

  if (giftType !== allowedType) {
    return {
      ok: false,
      error: allowedType === 'set'
        ? 'Для вашего тарифа доступен только подарочный сет'
        : 'Для вашего тарифа доступен только подарочный ролл',
    };
  }

  const sku = getProductSku(gift);
  if (!catalogSkuSet(allowedType).has(sku)) {
    return { ok: false, error: 'Выбранный подарок не найден в доступном каталоге' };
  }

  return { ok: true, giftType };
}

module.exports = {
  validateSubscriptionGifts,
  normalizeGiftType,
};
