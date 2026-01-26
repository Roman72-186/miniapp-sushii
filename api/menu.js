// api/menu.js — Endpoint для получения меню с категориями
// Vercel Serverless Function (CommonJS)

const { getProducts } = require('./frontpad');

/**
 * Определяет категорию товара по названию
 */
function getCategory(name) {
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
  if (lowerName.includes('суши пицца') || lowerName.includes('суши-пицца') || lowerName.includes('сендвич')) {
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
 */
function cleanName(name) {
  return name.replace(/\s*\*+\s*$/, '').trim();
}

/**
 * Категории для меню
 */
const CATEGORIES = [
  { id: 'sets', name: 'Сеты', icon: '🍱', order: 1 },
  { id: 'cold-rolls', name: 'Холодные роллы', icon: '🍣', order: 2 },
  { id: 'hot-rolls', name: 'Горячие роллы', icon: '🔥', order: 3 },
  { id: 'bowls', name: 'Боулы и Поке', icon: '🥗', order: 4 },
  { id: 'special', name: 'Суши-пицца', icon: '🍕', order: 5 },
  { id: 'soups', name: 'Супы', icon: '🍜', order: 6 },
  { id: 'drinks', name: 'Напитки', icon: '🥤', order: 7 },
  { id: 'extras', name: 'Дополнительно', icon: '🥢', order: 8 },
];

module.exports = async (req, res) => {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Получаем товары из Frontpad
    const result = await getProducts(); // Теперь getProducts возвращает { success, data, error }

    // Проверяем, была ли ошибка при получении товаров
    if (!result.success) {
      console.error('Menu API error from Frontpad:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error.message || 'Ошибка получения меню из Frontpad',
        errorCode: result.error.code // Передаем код ошибки для диагностики
      });
    }

    // Используем result.data, который содержит массив продуктов
    const products = result.data;

    // Категоризируем и обогащаем данные
    const categorizedProducts = products
      .map(product => ({
        ...product,
        cleanName: cleanName(product.name),
        category: getCategory(product.name),
        hasAsterisk: product.name.includes('*'),
      }))
      .filter(product => product.category !== 'hidden') // Скрываем подписки
      .filter(product => product.price > 0); // Скрываем товары с нулевой ценой

    // Группируем по категориям
    const groupedByCategory = {};
    CATEGORIES.forEach(cat => {
      groupedByCategory[cat.id] = categorizedProducts.filter(
        p => p.category === cat.id
      );
    });

    // Формируем ответ
    return res.status(200).json({
      success: true,
      categories: CATEGORIES,
      products: categorizedProducts,
      grouped: groupedByCategory,
      total: categorizedProducts.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Menu API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Ошибка получения меню',
    });
  }
};
