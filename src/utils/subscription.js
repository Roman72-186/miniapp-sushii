// src/utils/subscription.js — Логика подписок

/**
 * Типы подписок и их лимиты
 */
export const SUBSCRIPTION_TIERS = {
  // Базовая подписка - только скидки
  290: {
    id: 290,
    name: 'Базовая',
    price: 290,
    features: ['Скидки на все меню'],
    freeRollLimit: 0,
    freeSetLimit: 0,
    freeCoffee: false,
  },
  // Средняя подписка - 2 бесплатных ролла до 600₽
  490: {
    id: 490,
    name: 'Стандарт',
    price: 490,
    features: ['Скидки на все меню', '2 бесплатных ролла до 600₽'],
    freeRollLimit: 600,
    freeRollCount: 2,
    freeSetLimit: 0,
    freeCoffee: false,
  },
  // Премиум подписка - бесплатный сет до 2000₽ + кофе
  1190: {
    id: 1190,
    name: 'Премиум',
    price: 1190,
    features: [
      'Скидки на все меню',
      'Бесплатный сет до 2000₽',
      'Бесплатный кофе',
    ],
    freeRollLimit: 0,
    freeSetLimit: 2000,
    freeCoffee: true,
  },
};

/**
 * Получает информацию о подписке из URL параметров
 * @returns {Object|null} - Данные подписки или null
 */
export function getSubscriptionFromUrl() {
  const params = new URLSearchParams(window.location.search);

  const subscriptionId = params.get('subscription');
  const subscriptionType = params.get('subscription_type');

  if (subscriptionId || subscriptionType) {
    const tier = parseInt(subscriptionType || subscriptionId, 10);
    return SUBSCRIPTION_TIERS[tier] || null;
  }

  return null;
}

/**
 * Получает информацию о подписке из Telegram WebApp
 * @returns {Object|null} - Данные подписки или null
 */
export function getSubscriptionFromTelegram() {
  if (typeof window === 'undefined') return null;

  const tg = window.Telegram?.WebApp;
  if (!tg) return null;

  // Пробуем получить из initDataUnsafe.start_param
  const startParam = tg.initDataUnsafe?.start_param;
  if (startParam) {
    // Формат: sub_490 или просто 490
    const match = startParam.match(/(?:sub[_-]?)?(\d+)/i);
    if (match) {
      const tier = parseInt(match[1], 10);
      return SUBSCRIPTION_TIERS[tier] || null;
    }
  }

  return null;
}

/**
 * Получает текущую подписку пользователя
 * Приоритет: URL params > Telegram start_param > null
 * @returns {Object|null} - Данные подписки
 */
export function getCurrentSubscription() {
  return getSubscriptionFromUrl() || getSubscriptionFromTelegram() || null;
}

/**
 * Проверяет, доступен ли товар бесплатно по подписке
 * @param {Object} product - Товар
 * @param {Object} subscription - Подписка
 * @param {Object} usedBenefits - Использованные бонусы { rolls: number, set: boolean }
 * @returns {Object} - { isFree, reason }
 */
export function checkFreeAvailability(product, subscription, usedBenefits = {}) {
  if (!subscription) {
    return { isFree: false, reason: null };
  }

  const { category, price } = product;
  const { freeRollLimit, freeRollCount, freeSetLimit, freeCoffee } = subscription;
  const { rolls = 0, set = false } = usedBenefits;

  // Подписка 490: бесплатные роллы
  if (freeRollLimit > 0 && freeRollCount > 0) {
    const isRoll = category === 'cold-rolls' || category === 'hot-rolls';
    if (isRoll && price <= freeRollLimit && rolls < freeRollCount) {
      return {
        isFree: true,
        reason: `Бесплатно по подписке (${rolls + 1}/${freeRollCount})`,
      };
    }
  }

  // Подписка 1190: бесплатный сет
  if (freeSetLimit > 0) {
    const isSet = category === 'sets';
    if (isSet && price <= freeSetLimit && !set) {
      return {
        isFree: true,
        reason: 'Бесплатно по подписке',
      };
    }
  }

  // Подписка 1190: бесплатный кофе (если будет добавлен в меню)
  if (freeCoffee) {
    const isCoffee = product.name.toLowerCase().includes('кофе');
    if (isCoffee) {
      return {
        isFree: true,
        reason: 'Бесплатный кофе по подписке',
      };
    }
  }

  return { isFree: false, reason: null };
}

/**
 * Рассчитывает скидку для товара
 * @param {Object} product - Товар
 * @param {Object} subscription - Подписка
 * @param {number} clientDiscount - Персональная скидка клиента (%)
 * @returns {Object} - { originalPrice, finalPrice, discountPercent, discountAmount }
 */
export function calculateDiscount(product, subscription, clientDiscount = 0) {
  const { price, hasSale } = product;

  // Товары с sale=1 уже имеют скидку, не применяем дополнительную
  if (!hasSale && !subscription) {
    return {
      originalPrice: price,
      finalPrice: price,
      discountPercent: 0,
      discountAmount: 0,
    };
  }

  // Применяем персональную скидку клиента
  const discountPercent = clientDiscount || 0;
  const discountAmount = Math.round(price * discountPercent / 100);
  const finalPrice = price - discountAmount;

  return {
    originalPrice: price,
    finalPrice,
    discountPercent,
    discountAmount,
  };
}

/**
 * Форматирует описание преимуществ подписки
 * @param {Object} subscription - Подписка
 * @returns {string} - Описание
 */
export function formatSubscriptionBenefits(subscription) {
  if (!subscription) return '';
  return subscription.features.join(' • ');
}

/**
 * Проверяет, есть ли активная подписка
 * @param {Object} subscription - Подписка
 * @returns {boolean}
 */
export function hasActiveSubscription(subscription) {
  return subscription !== null && typeof subscription === 'object';
}
