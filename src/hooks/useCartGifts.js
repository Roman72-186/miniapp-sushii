// src/hooks/useCartGifts.js — Хук синхронизации подарочных роллов в корзине

import { useState, useEffect, useRef, useCallback } from 'react';
import { getProductImage } from '../config/imageMap';
import { syncCartGifts, PROMO_CODE, PROMO_THRESHOLD, AUTO_THRESHOLD, calcNonGiftTotal } from '../utils/cartGifts';

/**
 * Хук для автоматического управления подарками в корзине.
 *
 * @param {Object} params
 * @param {Array} params.items — текущие items корзины
 * @param {string} params.promoCode — введённый промокод
 * @param {Function} params.addItem — cart.addItem
 * @param {Function} params.removeItem — cart.removeItem
 */
export function useCartGifts({ items, promoCode, addItem, removeItem }) {
  const [promoGiftProducts, setPromoGiftProducts] = useState([]);
  const [thresholdGiftProducts, setThresholdGiftProducts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Фиксация выбранного подарка на сессию корзины
  const pickedPromoRef = useRef(null);
  const pickedThresholdRef = useRef(null);

  // Защита от повторной синхронизации во время добавления
  const syncingRef = useRef(false);

  // Загрузка списка подарочных товаров
  useEffect(() => {
    let cancelled = false;
    fetch('/api/gift-items')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.success) {
          setPromoGiftProducts(data.promoGifts || []);
          setThresholdGiftProducts(data.thresholdGifts || []);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => { cancelled = true; };
  }, []);

  // Сброс refs при полной очистке корзины
  const prevItemsLenRef = useRef(items.length);
  useEffect(() => {
    if (prevItemsLenRef.current > 0 && items.length === 0) {
      pickedPromoRef.current = null;
      pickedThresholdRef.current = null;
    }
    prevItemsLenRef.current = items.length;
  }, [items.length]);

  // Синхронизация подарков при изменении корзины / промокода
  useEffect(() => {
    if (!loaded || syncingRef.current) return;

    const { toAdd, toRemove } = syncCartGifts({
      items,
      promoCode,
      promoGiftProducts,
      thresholdGiftProducts,
      pickedPromoSku: pickedPromoRef.current,
      pickedThresholdSku: pickedThresholdRef.current,
    });

    if (toRemove.length === 0 && toAdd.length === 0) return;

    syncingRef.current = true;

    // Удаляем
    for (const id of toRemove) {
      removeItem(id);
      // Сбрасываем ref при удалении
      if (id.startsWith('gift-promo-')) pickedPromoRef.current = null;
      if (id.startsWith('gift-threshold-')) pickedThresholdRef.current = null;
    }

    // Добавляем
    for (const { product, giftSource } of toAdd) {
      const prefix = giftSource === 'promo' ? 'gift-promo' : 'gift-threshold';
      const id = `${prefix}-${product.sku}`;

      // Фиксируем выбор
      if (giftSource === 'promo') pickedPromoRef.current = product.sku;
      if (giftSource === 'threshold2500') pickedThresholdRef.current = product.sku;

      addItem({
        id,
        name: product.name,
        cleanName: product.name,
        price: 0,
        gift: true,
        sku: product.sku,
        image: getProductImage(product.name),
      }, 1, { giftSource });
    }

    // Небольшая задержка перед следующей синхронизацией
    setTimeout(() => { syncingRef.current = false; }, 50);
  }, [items, promoCode, promoGiftProducts, thresholdGiftProducts, loaded, addItem, removeItem]);

  // Информационные сообщения для UI
  const nonGiftTotal = calcNonGiftTotal(items);
  const messages = [];

  if (promoCode === PROMO_CODE) {
    if (nonGiftTotal >= PROMO_THRESHOLD) {
      const promoGift = items.find(i => i.giftSource === 'promo');
      if (promoGift) {
        messages.push({ type: 'success', text: `Подарочный ролл «${promoGift.product.cleanName || promoGift.product.name}» по промокоду добавлен` });
      }
    } else {
      const diff = PROMO_THRESHOLD - nonGiftTotal;
      messages.push({ type: 'info', text: `Добавьте товаров ещё на ${diff}₽, чтобы получить подарочный ролл по промокоду` });
    }
  }

  if (nonGiftTotal >= AUTO_THRESHOLD) {
    const threshGift = items.find(i => i.giftSource === 'threshold2500');
    if (threshGift) {
      messages.push({ type: 'success', text: `Подарочный ролл «${threshGift.product.cleanName || threshGift.product.name}» за заказ от ${AUTO_THRESHOLD}₽ добавлен` });
    }
  }

  // Валидация промокода
  const isPromoValid = promoCode === PROMO_CODE;

  return { messages, isPromoValid, loaded };
}
