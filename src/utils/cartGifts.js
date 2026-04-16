// src/utils/cartGifts.js — Логика подарочных роллов в корзине

// Пороговые суммы (конфиг)
export const PROMO_CODE = '102030';
export const PROMO_THRESHOLD = 2000;
export const AUTO_THRESHOLD = 2500;

/**
 * Считает сумму корзины без подарков (подарки не участвуют в пороге)
 */
export function calcNonGiftTotal(items) {
  return items.reduce((sum, item) => {
    if (item.product.gift) return sum;
    return sum + item.product.price * item.quantity;
  }, 0);
}

/**
 * Выбирает случайный товар из массива, исключая SKU из excludeSkus
 */
export function pickGiftProduct(giftProducts, excludeSkus = []) {
  const available = giftProducts.filter(p => !excludeSkus.includes(String(p.sku)));
  if (available.length === 0) return null;
  if (available.length === 1) return available[0];
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Синхронизирует подарки в корзине.
 * Возвращает { toAdd: [...], toRemove: [...ids] }
 */
export function syncCartGifts({
  items,
  promoCode,
  promoGiftProducts,
  thresholdGiftProducts,
  pickedPromoSku,
  pickedThresholdSku,
}) {
  const nonGiftTotal = calcNonGiftTotal(items);
  const toAdd = [];
  const toRemove = [];

  const existingPromo = items.find(i => i.giftSource === 'promo');
  const existingThreshold = items.find(i => i.giftSource === 'threshold2500');

  // --- Промо-подарок ---
  const promoActive = promoCode === PROMO_CODE && nonGiftTotal >= PROMO_THRESHOLD && promoGiftProducts.length > 0;

  if (promoActive && !existingPromo) {
    // Выбираем товар — используем зафиксированный или новый
    let product = pickedPromoSku
      ? promoGiftProducts.find(p => String(p.sku) === String(pickedPromoSku))
      : null;
    if (!product) product = pickGiftProduct(promoGiftProducts);
    if (product) {
      toAdd.push({ product, giftSource: 'promo' });
    }
  } else if (!promoActive && existingPromo) {
    toRemove.push(existingPromo.product.id);
  }

  // --- Подарок по порогу 2500 ---
  const thresholdActive = nonGiftTotal >= AUTO_THRESHOLD && thresholdGiftProducts.length > 0;

  if (thresholdActive && !existingThreshold) {
    // Исключаем SKU промо-подарка чтобы не дублировать
    const promoSku = existingPromo?.product?.sku
      || (promoActive && toAdd[0]?.product?.sku)
      || null;
    const excludeSkus = promoSku ? [String(promoSku)] : [];

    let product = pickedThresholdSku
      ? thresholdGiftProducts.find(p => String(p.sku) === String(pickedThresholdSku))
      : null;
    if (!product) product = pickGiftProduct(thresholdGiftProducts, excludeSkus);
    // Если все исключены — берём любой
    if (!product) product = pickGiftProduct(thresholdGiftProducts);
    if (product) {
      toAdd.push({ product, giftSource: 'threshold2500' });
    }
  } else if (!thresholdActive && existingThreshold) {
    toRemove.push(existingThreshold.product.id);
  }

  return { toAdd, toRemove };
}
