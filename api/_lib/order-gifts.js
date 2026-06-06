const { getEnrichedGiftRules } = require('./gift-rules');

function normalizePromoCode(code) {
  return String(code || '').trim().toUpperCase();
}

function isGiftProduct(product) {
  const source = String(product?.gift_source || product?.giftSource || '').trim();
  return source === 'subscription' || source.startsWith('promo') || source.startsWith('threshold');
}

function getProductSku(product) {
  return String(product?.sku || product?.frontpad_id || product?.frontpadId || product?.product_id || product?.id || '').trim();
}

function nonGiftTotal(products) {
  return products.reduce((sum, product) => {
    if (isGiftProduct(product)) return sum;
    return sum + (Number(product.price) || 0) * (Number(product.quantity) || 1);
  }, 0);
}

function makeGiftProduct(rule) {
  const product = rule.product;
  if (!product?.sku) return null;
  return {
    id: product.sku,
    product_id: product.sku,
    sku: product.sku,
    quantity: 1,
    name: product.name,
    price: 0,
    gift_source: `${rule.type}:${rule.id}`,
  };
}

function appendEligibleOrderGifts(products, promoCode, rulesProvider = getEnrichedGiftRules) {
  const orderProducts = Array.isArray(products) ? [...products] : [];
  const total = nonGiftTotal(orderProducts);
  const normalizedCode = normalizePromoCode(promoCode);
  const { promoRules = [], thresholdRules = [] } = rulesProvider({ activeOnly: true }) || {};
  const existingSources = new Set(orderProducts.map(product => String(product.gift_source || product.giftSource || '').trim()).filter(Boolean));
  const existingGiftSkus = new Set(orderProducts.filter(isGiftProduct).map(getProductSku).filter(Boolean));

  const activePromoRules = promoRules
    .filter(rule =>
      rule.enabled !== false &&
      rule.product &&
      normalizePromoCode(rule.code) === normalizedCode &&
      total >= Number(rule.threshold || 0)
    )
    .sort((a, b) => Number(a.threshold) - Number(b.threshold));

  for (const promoRule of activePromoRules) {
    const source = `${promoRule.type}:${promoRule.id}`;
    const sku = String(promoRule.product.sku || '');
    if (!existingSources.has(source) && !existingGiftSkus.has(sku)) {
      const gift = makeGiftProduct(promoRule);
      if (gift) {
        orderProducts.push(gift);
        existingSources.add(source);
        existingGiftSkus.add(sku);
      }
    }
  }

  const activeThresholdRules = thresholdRules
    .filter(rule => rule.enabled !== false && rule.product && total >= Number(rule.threshold || 0))
    .sort((a, b) => Number(a.threshold) - Number(b.threshold));

  for (const rule of activeThresholdRules) {
    const source = `${rule.type}:${rule.id}`;
    const sku = String(rule.product.sku || '');
    if (existingSources.has(source) || existingGiftSkus.has(sku)) continue;
    const gift = makeGiftProduct(rule);
    if (!gift) continue;
    orderProducts.push(gift);
    existingSources.add(source);
    existingGiftSkus.add(sku);
  }

  return orderProducts;
}

module.exports = {
  appendEligibleOrderGifts,
  isGiftProduct,
  nonGiftTotal,
  normalizePromoCode,
};
