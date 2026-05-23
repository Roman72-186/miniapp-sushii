export function calcNonGiftTotal(items) {
  return items.reduce((sum, item) => {
    if (item.product.gift) return sum;
    return sum + item.product.price * item.quantity;
  }, 0);
}

export function normalizePromoCode(code) {
  return String(code || '').trim().toUpperCase();
}

function giftSourceType(source) {
  const value = String(source || '');
  if (value === 'promo' || value.startsWith('promo:')) return 'promo';
  if (value === 'threshold2500' || value === 'threshold' || value.startsWith('threshold:')) return 'threshold';
  return 'subscription';
}

function ruleSource(rule) {
  return `${rule.type}:${rule.id}`;
}

function activeProduct(rule) {
  return rule && rule.enabled !== false && rule.product ? rule.product : null;
}

export function syncCartGifts({ items, promoCode, promoRules = [], thresholdRules = [] }) {
  const nonGiftTotal = calcNonGiftTotal(items);
  const normalizedCode = normalizePromoCode(promoCode);
  const toAdd = [];
  const toRemove = [];
  const usedSkus = new Set();

  const existingGifts = items.filter(item => item.product.gift);
  const existingPromo = existingGifts.find(item => giftSourceType(item.giftSource) === 'promo');
  const existingThresholds = existingGifts.filter(item => giftSourceType(item.giftSource) === 'threshold');

  const matchedPromoRule = promoRules.find(rule =>
    activeProduct(rule) &&
    normalizePromoCode(rule.code) === normalizedCode
  );
  const activePromoRule = matchedPromoRule && nonGiftTotal >= Number(matchedPromoRule.threshold || 0)
    ? matchedPromoRule
    : null;

  if (activePromoRule) {
    const expectedSource = ruleSource(activePromoRule);
    if (!existingPromo || existingPromo.giftSource !== expectedSource) {
      if (existingPromo) toRemove.push(existingPromo.product.id);
      toAdd.push({
        product: activePromoRule.product,
        giftSource: expectedSource,
        rule: activePromoRule,
      });
    } else {
      usedSkus.add(String(existingPromo.product.sku));
    }
    usedSkus.add(String(activePromoRule.product.sku));
  } else if (existingPromo) {
    toRemove.push(existingPromo.product.id);
  }

  const activeThresholdRules = thresholdRules
    .filter(rule => activeProduct(rule) && nonGiftTotal >= Number(rule.threshold || 0))
    .sort((a, b) => Number(a.threshold) - Number(b.threshold));
  const activeThresholdIds = new Set(activeThresholdRules.map(rule => String(rule.id)));

  for (const gift of existingThresholds) {
    const ruleId = String(gift.giftRuleId || String(gift.giftSource || '').split(':')[1] || '');
    if (!activeThresholdIds.has(ruleId)) {
      toRemove.push(gift.product.id);
    } else {
      usedSkus.add(String(gift.product.sku));
    }
  }

  for (const rule of activeThresholdRules) {
    const expectedSource = ruleSource(rule);
    const exists = existingThresholds.some(gift => gift.giftSource === expectedSource);
    const sku = String(rule.product.sku);
    if (!exists && !usedSkus.has(sku)) {
      toAdd.push({
        product: rule.product,
        giftSource: expectedSource,
        rule,
      });
      usedSkus.add(sku);
    }
  }

  return { toAdd, toRemove, matchedPromoRule, activePromoRule, activeThresholdRules };
}

export function describeGiftSource(source, product = {}) {
  const type = giftSourceType(source);
  if (type === 'promo') return product.giftCode ? `По промокоду ${product.giftCode}` : 'По промокоду';
  if (type === 'threshold') return product.giftThreshold ? `За чек от ${product.giftThreshold}₽` : 'За горячий чек';
  return 'Подарок по подписке';
}
