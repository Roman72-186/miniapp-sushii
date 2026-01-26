// src/config/imageMap.js — Маппинг названий товаров к изображениям

/**
 * Маппинг названий товаров к файлам изображений
 * Ключ: нормализованное название товара (lowercase, без звездочек)
 * Значение: путь к изображению в public/img/
 */
export const IMAGE_MAP = {
  // Роллы (PNG)
  'эйдж гурме': '/img/age_gurme.PNG',
  'аляска кунсей': '/img/alaska_kunsei.PNG',
  'авокадо маки': '/img/avokado_maki.PNG',
  'бонито мидии': '/img/bonito_midii.PNG',
  'бонито тунец': '/img/bonito_tunec.PNG',
  'боул с креветками': '/img/boul_s_krevetkami.PNG',
  'боул с лососем': '/img/boul_s_lososem.PNG',
  'боул с тунцом': '/img/boul_s_tuncom.PNG',
  'бруклин': '/img/bruklin.PNG',
  'детройт': '/img/detroit.PNG',
  'дон жуан': '/img/don_juan.PNG',
  'гламур': '/img/glamur.PNG',
  'гуччи': '/img/gujji.PNG',
  'игуана': '/img/iguana.PNG',
  'калифорния': '/img/kalifornia.PNG',
  'кани гриль': '/img/kani_gril.PNG',
  'каппа маки': '/img/kappa_maki.PNG',
  'киото чикен': '/img/kioto_chiken.PNG',
  'краб дуэт': '/img/krab_duet.PNG',
  'лосось фаер': '/img/losos_fair.PNG',
  'маленький принц': '/img/mal_princ.PNG',
  'манхэттен': '/img/manheten.PNG',
  'мидии маки гриль': '/img/midii_maki_gril.PNG',
  'мидии терияки': '/img/midii_teriaki.PNG',
  'мидуэй': '/img/Miduei.PNG',
  'нежный поцелуй': '/img/nejni_kiss.PNG',
  'ниагара': '/img/niagara.PNG',
  'пикантный лосось': '/img/picantnii_losos.jpg',
  'пинк': '/img/pink.PNG',
  'ролл с беконом': '/img/roll_s_bekonom.PNG',
  'самурай': '/img/samurai.PNG',
  'сегун': '/img/seegun.PNG',
  'тори ролл': '/img/tori_roll.PNG',
  'запеченный лайт': '/img/zapecheni_lite.PNG',

  // Роллы (JPG с русскими названиями)
  'поке с креветками': '/img/Поке с креветками.jpg',
  'поке с курицей': '/img/Поке с курицей.jpg',
  'спайси эби маки': '/img/Спайси эби маки.jpg',
  'суши пицца №3': '/img/Суши пицца №3.jpg',
  'суши сендвич с лососем': '/img/Суши сендвич с лососем.jpg',
  'сяке кунсей маки': '/img/Сяке кунсей маки.jpg',
  'сяке маки': '/img/Сяке маки.jpg',
  'туна маки': '/img/Туна маки.jpg',
  'туна фреш': '/img/Туна фреш.jpg',
  'унаги маки': '/img/Унаги маки.jpg',
  'филадельфия лайт с огурцом': '/img/Филадельфия лайт с огурцом.jpg',
  'фреш ролл': '/img/Фреш ролл.jpg',
  'чеддер скин ролл': '/img/Чеддер скин ролл.jpg',
  'чизи эби': '/img/Чизи эби.jpg',
  'чикен гриль': '/img/Чикен гриль.jpg',
  'чикен лав': '/img/Чикен лав.jpg',
  'чикен фиера': '/img/Чикен фиера.jpg',
  'чука маки': '/img/Чука маки.jpg',
  'шёлковый путь': '/img/Шёлковый путь.jpg',
  'шелковый путь': '/img/Шёлковый путь.jpg', // альтернативное написание
};

/**
 * Плейсхолдер для товаров без изображения
 */
export const DEFAULT_IMAGE = '/img/placeholder.png';

/**
 * Нормализует название товара для поиска в маппинге
 * @param {string} name - Название товара
 * @returns {string} - Нормализованное название
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\s*\*+\s*$/, '') // Убираем звездочки в конце
    .replace(/\s+/g, ' ')      // Нормализуем пробелы
    .trim();
}

/**
 * Получает URL изображения для товара
 * @param {string} productName - Название товара
 * @returns {string} - URL изображения
 */
export function getProductImage(productName) {
  const normalized = normalizeName(productName);

  // Точное совпадение
  if (IMAGE_MAP[normalized]) {
    return IMAGE_MAP[normalized];
  }

  // Частичное совпадение (поиск по началу названия)
  const keys = Object.keys(IMAGE_MAP);
  for (const key of keys) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return IMAGE_MAP[key];
    }
  }

  return DEFAULT_IMAGE;
}

/**
 * Проверяет, есть ли изображение для товара
 * @param {string} productName - Название товара
 * @returns {boolean}
 */
export function hasImage(productName) {
  return getProductImage(productName) !== DEFAULT_IMAGE;
}

/**
 * Получает все доступные изображения
 * @returns {Object} - Объект с маппингом
 */
export function getAllImages() {
  return { ...IMAGE_MAP };
}
