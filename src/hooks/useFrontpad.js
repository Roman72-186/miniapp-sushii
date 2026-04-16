// src/hooks/useFrontpad.js — React хуки для работы с Frontpad API

import { useState, useCallback, useMemo } from 'react';

/**
 * Хук для корзины
 * @returns {Object} - { items, addItem, removeItem, updateQuantity, clear, total, count }
 */
export function useCart() {
  const [items, setItems] = useState([]);

  const addItem = useCallback((product, quantity = 1, extras = {}) => {
    setItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.product.gift) return prev; // подарок не дублируем
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, ...extras }];
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    setItems(prev => {
      const item = prev.find(i => i.product.id === productId);
      if (!item || item.product.gift) return prev; // подарки нельзя менять
      if (quantity <= 0) return prev.filter(i => i.product.id !== productId);
      return prev.map(i => i.product.id === productId ? { ...i, quantity } : i);
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const clearNonGiftItems = useCallback(() => {
    setItems(prev => prev.filter(item => item.product.gift));
  }, []);

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [items]);

  const count = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clear,
    clearNonGiftItems,
    total,
    count,
  };
}
