// src/hooks/useFrontpad.js — React хуки для работы с Frontpad API

import { useState, useCallback, useMemo } from 'react';

/**
 * Хук для корзины
 * @returns {Object} - { items, addItem, removeItem, updateQuantity, clear, total, count }
 */
export function useCart() {
  const [items, setItems] = useState([]);

  const addItem = useCallback((product, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  const clear = useCallback(() => {
    setItems([]);
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
    total,
    count,
  };
}
