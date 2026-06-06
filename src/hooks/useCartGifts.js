import { useState, useEffect, useRef } from 'react';
import { getProductImage } from '../config/imageMap';
import {
  calcNonGiftTotal,
  normalizePromoCode,
  syncCartGifts,
} from '../utils/cartGifts';

export function useCartGifts({ items, promoCode, addItem, removeItem }) {
  const [promoRules, setPromoRules] = useState([]);
  const [thresholdRules, setThresholdRules] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const syncingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/gift-items')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.success) {
          setPromoRules(data.promoRules || []);
          setThresholdRules(data.thresholdRules || []);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded || syncingRef.current) return;

    const { toAdd, toRemove } = syncCartGifts({
      items,
      promoCode,
      promoRules,
      thresholdRules,
    });

    if (toRemove.length === 0 && toAdd.length === 0) return;

    syncingRef.current = true;

    for (const id of toRemove) removeItem(id);

    for (const { product, giftSource, rule } of toAdd) {
      const type = rule.type;
      const id = `gift-${type}-${rule.id}-${product.sku}`;
      addItem({
        id,
        name: product.name,
        cleanName: product.name,
        price: 0,
        gift: true,
        sku: product.sku,
        image: getProductImage(product.name),
        giftRuleId: rule.id,
        giftRuleType: type,
        giftCode: type === 'promo' ? rule.code : undefined,
        giftThreshold: rule.threshold,
      }, 1, { giftSource });
    }

    setTimeout(() => { syncingRef.current = false; }, 50);
  }, [items, promoCode, promoRules, thresholdRules, loaded, addItem, removeItem]);

  const nonGiftTotal = calcNonGiftTotal(items);
  const normalizedCode = normalizePromoCode(promoCode);
  const messages = [];
  const matchedPromoRules = promoRules.filter(rule =>
    rule.enabled !== false &&
    rule.product &&
    normalizePromoCode(rule.code) === normalizedCode
  );
  const activeMatchedPromoRules = matchedPromoRules.filter(rule => nonGiftTotal >= Number(rule.threshold || 0));
  const activePromoGifts = items.filter(item => item.product.gift && String(item.giftSource || '').startsWith('promo:'));

  if (normalizedCode) {
    if (matchedPromoRules.length === 0) {
      messages.push({ type: 'info', text: 'Промокод не действует' });
    } else if (activePromoGifts.length === 0 && activeMatchedPromoRules.length === 0) {
      const minThreshold = Math.min(...matchedPromoRules.map(rule => Number(rule.threshold || 0)));
      const diff = minThreshold - nonGiftTotal;
      messages.push({ type: 'info', text: `Добавьте товаров ещё на ${diff}₽, чтобы получить подарок по промокоду` });
    } else {
      for (const gift of activePromoGifts) {
        messages.push({
          type: 'success',
          text: `Подарок «${gift.product.cleanName || gift.product.name}» по промокоду добавлен`,
        });
      }
    }
  }

  const activeThresholdGifts = items.filter(item => item.product.gift && String(item.giftSource || '').startsWith('threshold:'));
  for (const gift of activeThresholdGifts) {
    messages.push({
      type: 'success',
      text: `Подарок «${gift.product.cleanName || gift.product.name}» за чек от ${gift.product.giftThreshold || 0}₽ добавлен`,
    });
  }

  return {
    messages,
    isPromoValid: !normalizedCode || matchedPromoRules.length > 0,
    loaded,
  };
}
