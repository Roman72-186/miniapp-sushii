// src/hooks/useFrontpad.js — React хуки для работы с Frontpad API

import { useState, useEffect, useCallback, useMemo } from 'react';
import { processProducts, groupByCategory, CATEGORIES } from '../utils/categories';
import { getCurrentSubscription, checkFreeAvailability, calculateDiscount } from '../utils/subscription';
import { getProductImage } from '../config/imageMap';

/**
 * Базовый URL для API
 */
const API_BASE = '/api';

/**
 * Хук для загрузки меню
 * @returns {Object} - { products, categories, grouped, loading, error, refetch }
 */
export function useMenu() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/menu`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error || 'Ошибка загрузки меню');
      }
      setData(json);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить меню');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // Обогащаем продукты изображениями
  const products = useMemo(() => {
    if (!data?.products) return [];
    return data.products.map(p => ({
      ...p,
      image: getProductImage(p.name),
    }));
  }, [data]);

  const grouped = useMemo(() => {
    if (!products.length) return {};
    return groupByCategory(products);
  }, [products]);

  return {
    products,
    categories: CATEGORIES,
    grouped,
    loading,
    error,
    refetch: fetchMenu,
    total: data?.total || 0,
    updatedAt: data?.updatedAt || null,
  };
}

/**
 * Хук для работы с подпиской
 * @returns {Object} - { subscription, hasSubscription, benefits, usedBenefits, useBenefit }
 */
export function useSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [usedBenefits, setUsedBenefits] = useState({ rolls: 0, set: false });

  useEffect(() => {
    const sub = getCurrentSubscription();
    setSubscription(sub);
  }, []);

  const hasSubscription = subscription !== null;

  const benefits = useMemo(() => {
    if (!subscription) return [];
    return subscription.features || [];
  }, [subscription]);

  const useBenefit = useCallback((type) => {
    setUsedBenefits(prev => {
      if (type === 'roll') {
        return { ...prev, rolls: prev.rolls + 1 };
      }
      if (type === 'set') {
        return { ...prev, set: true };
      }
      return prev;
    });
  }, []);

  const resetBenefits = useCallback(() => {
    setUsedBenefits({ rolls: 0, set: false });
  }, []);

  return {
    subscription,
    hasSubscription,
    benefits,
    usedBenefits,
    useBenefit,
    resetBenefits,
  };
}

/**
 * Хук для расчёта цены товара с учётом подписки
 * @param {Object} product - Товар
 * @param {Object} subscription - Подписка
 * @param {Object} usedBenefits - Использованные бонусы
 * @param {number} clientDiscount - Персональная скидка клиента
 * @returns {Object} - { isFree, freeReason, originalPrice, finalPrice, discountPercent }
 */
export function useProductPrice(product, subscription, usedBenefits, clientDiscount = 0) {
  return useMemo(() => {
    const freeCheck = checkFreeAvailability(product, subscription, usedBenefits);
    const discount = calculateDiscount(product, subscription, clientDiscount);

    return {
      isFree: freeCheck.isFree,
      freeReason: freeCheck.reason,
      originalPrice: discount.originalPrice,
      finalPrice: freeCheck.isFree ? 0 : discount.finalPrice,
      discountPercent: discount.discountPercent,
      discountAmount: discount.discountAmount,
    };
  }, [product, subscription, usedBenefits, clientDiscount]);
}

/**
 * Хук для фильтрации и поиска товаров
 * @param {Array} products - Массив товаров
 * @returns {Object} - { filtered, searchQuery, setSearchQuery, categoryFilter, setCategoryFilter }
 */
export function useProductFilter(products) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(null);

  const filtered = useMemo(() => {
    let result = products;

    // Фильтр по категории
    if (categoryFilter) {
      result = result.filter(p => p.category === categoryFilter);
    }

    // Поиск по названию
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.cleanName?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [products, searchQuery, categoryFilter]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter(null);
  }, []);

  return {
    filtered,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    clearFilters,
  };
}

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
