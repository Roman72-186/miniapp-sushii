// src/utils/categories.js — Логика категоризации товаров

/**
 * Определения категорий меню
 */
export const CATEGORIES = [
  { id: 'sets', name: 'Сеты', icon: '🍱', order: 1 },
  { id: 'cold-rolls', name: 'Холодные роллы', icon: '🍣', order: 2 },
  { id: 'hot-rolls', name: 'Горячие роллы', icon: '🔥', order: 3 },
  { id: 'bowls', name: 'Боулы и Поке', icon: '🥗', order: 4 },
  { id: 'special', name: 'Суши-пицца', icon: '🍕', order: 5 },
  { id: 'soups', name: 'Супы', icon: '🍜', order: 6 },
  { id: 'drinks', name: 'Напитки', icon: '🥤', order: 7 },
  { id: 'extras', name: 'Дополнительно', icon: '🥢', order: 8 },
];

/**
 * Определяет категорию товара по названию
 * @param {string} name - Название товара
 * @returns {string} - ID категории
 */
export function getCategory(name) {
  const lowerName = name.toLowerCase().trim();

  // Скрытые товары (подписки, служебные)
  if (lowerName.includes('подписка')) {
    return 'hidden';
  }

  // Сеты
  if (lowerName.startsWith('сет ') || lowerName.includes(' сет')) {
    return 'sets';
  }

  // Соусы и приправы (допы)
  if (
    lowerName.includes('соус') ||
    lowerName.includes('васаби') ||
    lowerName.includes('имбирь')
  ) {
    return 'extras';
  }

  // Напитки
  if (
    lowerName.includes('lipton') ||
    lowerName.includes('лаймон') ||
    lowerName.includes('аква') ||
    lowerName.includes('адреналин') ||
    lowerName.includes('фрустайл') ||
    lowerName.includes('вода ') ||
    lowerName.includes('кола') ||
    lowerName.includes('эвервесс')
  ) {
    return 'drinks';
  }

  // Супы
  if (lowerName.startsWith('суп ')) {
    return 'soups';
  }

  // Боулы и поке
  if (lowerName.includes('боул') || lowerName.includes('поке')) {
    return 'bowls';
  }

  // Суши-пицца и сендвичи
  if (
    lowerName.includes('суши пицца') ||
    lowerName.includes('суши-пицца') ||
    lowerName.includes('сендвич')
  ) {
    return 'special';
  }

  // Горячие роллы (запеченные, горячие, хот)
  if (
    lowerName.includes('запеченн') ||
    lowerName.includes('горячий') ||
    lowerName.includes(' хот')
  ) {
    return 'hot-rolls';
  }

  // Остальное — холодные роллы
  return 'cold-rolls';
}

/**
 * Очищает название товара от суффиксов * и **
 * @param {string} name - Исходное название
 * @returns {string} - Очищенное название
 */
export function cleanProductName(name) {
  return name.replace(/\s*\*+\s*$/, '').trim();
}

/**
 * Проверяет, содержит ли название звездочку (пометка)
 * @param {string} name - Название товара
 * @returns {boolean}
 */
export function hasAsterisk(name) {
  return name.includes('*');
}

/**
 * Группирует товары по категориям
 * @param {Array} products - Массив товаров
 * @returns {Object} - Объект с товарами по категориям
 */
export function groupByCategory(products) {
  const grouped = {};

  CATEGORIES.forEach(cat => {
    grouped[cat.id] = [];
  });

  products.forEach(product => {
    const category = product.category || getCategory(product.name);
    if (grouped[category]) {
      grouped[category].push(product);
    }
  });

  return grouped;
}

/**
 * Обогащает товар информацией о категории
 * @param {Object} product - Товар из API
 * @returns {Object} - Обогащённый товар
 */
export function enrichProduct(product) {
  return {
    ...product,
    cleanName: cleanProductName(product.name),
    category: getCategory(product.name),
    hasAsterisk: hasAsterisk(product.name),
  };
}

/**
 * Фильтрует и обогащает товары
 * @param {Array} products - Массив товаров из API
 * @returns {Array} - Обработанные товары
 */
export function processProducts(products) {
  return products
    .map(enrichProduct)
    .filter(p => p.category !== 'hidden')
    .filter(p => p.price > 0);
}
