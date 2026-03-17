// src/config/descriptionMap.js — Маппинг названий товаров к описаниям/составу

/**
 * Маппинг названий товаров к описаниям
 * Ключ: нормализованное название (lowercase, без звездочек)
 * Значение: строка с описанием/составом
 *
 * Описания добавляются вручную по мере необходимости.
 */
const DESCRIPTION_MAP = {
  // Описания будут добавлены позже
};

/**
 * Нормализует название товара для поиска (аналогично imageMap.js)
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/э/g, 'е')
    .replace(/\s*\*+\s*$/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Получает описание товара по названию
 * @param {string} productName - Название товара
 * @returns {string|null} - Описание или null если нет
 */
export function getProductDescription(productName) {
  if (!productName) return null;
  const normalized = normalizeName(productName);

  // 1. Точное совпадение
  if (DESCRIPTION_MAP[normalized]) {
    return DESCRIPTION_MAP[normalized];
  }

  // 2. Частичное совпадение
  const keys = Object.keys(DESCRIPTION_MAP);
  for (const key of keys) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return DESCRIPTION_MAP[key];
    }
  }

  return null;
}
