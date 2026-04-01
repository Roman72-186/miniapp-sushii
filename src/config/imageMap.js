// src/config/imageMap.js — Маппинг названий товаров к изображениям

/**
 * Маппинг названий товаров к файлам изображений
 * Ключ: нормализованное название (lowercase, без звездочек, без префиксов "ролл")
 * Значение: путь к изображению в public/img/
 */
const IMAGE_MAP = {
  // === Английские имена файлов (PNG) ===
  'аге гурме': '/img/age_gurme.PNG',
  'аляска кунсей': '/img/alaska_kunsei.PNG',
  'авокадо маки': '/img/avokado_maki.PNG',
  'бонито мидии': '/img/bonito_midii.PNG',
  'бонито тунец': '/img/bonito_tunec.PNG',
  'боул с креветками': '/img/boul_s_krevetkami.PNG',
  'боул с лососем': '/img/boul_s_lososem.PNG',
  'боул с тунцом': '/img/boul_s_tuncom.PNG',
  'бруклин': '/img/bruklin.PNG',
  'детройт': '/img/detroit.PNG',
  'горячий дон жуан': '/img/don_juan.PNG',
  'гламур': '/img/glamur.PNG',
  'гуччи': '/img/gujji.PNG',
  'игуана': '/img/iguana.PNG',
  'ролл игуана': '/img/iguana.PNG',
  'калифорния': '/img/kalifornia.PNG',
  'кани гриль': '/img/kani_gril.PNG',
  'каппа маки': '/img/kappa_maki.PNG',
  'киото чикен': '/img/kioto_chiken.PNG',
  'краб дуэт гриль': '/img/krab_duet.PNG',
  'запеченный лосось файр': '/img/losos_fair.PNG',
  'манхеттен': '/img/manheten.PNG',
  'мидии маки гриль': '/img/midii_maki_gril.PNG',
  'мидии терияки': '/img/midii_teriaki.PNG',
  'ролл мидори терияки': '/img/midii_teriaki.PNG',
  'запеченный мидуэй': '/img/miduei(1).PNG',
  'запеченный мидзуи': '/img/miduei(1).PNG',
  'нежный поцелуй': '/img/nejni_kiss.PNG',
  'ниагара': '/img/niagara.PNG',
  'розовый': '/img/pink.PNG',
  'запеченный ролл с беконом': '/img/roll_s_bekonom.PNG',
  'самурай': '/img/samurai.PNG',
  'благородный сёгун': '/img/seegun.PNG',
  'благородный сегун': '/img/seegun.PNG',
  'запеченный тори ролл': '/img/tori_roll.PNG',
  'запеченный лайт': '/img/zapecheni_lite.PNG',

  // === Русские имена файлов (JPG) ===
  'поке с креветками': '/img/Поке с креветками.jpg',
  'поке с курицей': '/img/Поке с курицей.jpg',
  'спайси эби маки': '/img/Спайси эби маки.jpg',
  'суши пицца №3 (курица)': '/img/Суши пицца №3.jpg',
  'суши-пицца курица': '/img/Суши пицца №3.jpg',
  'суши сендвич с лососем': '/img/Суши сендвич с лососем.jpg',
  'суши-сендвич с лососем': '/img/Суши сендвич с лососем.jpg',
  'суши-сэндвич с лососем': '/img/Суши сендвич с лососем.jpg',
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
  'шелковый путь': '/img/Шёлковый путь.jpg',

  // === Дополнительные совпадения (префиксы "ролл") ===
  'ролл калифорния дуэт': '/img/kalifornia.PNG',
  'калифорния дуэт': '/img/kalifornia.PNG',
  'ролл филадельфия дуэт': '/img/Филадельфия лайт с огурцом.jpg',
  'ролл филадельфия кани': '/img/Филадельфия лайт с огурцом.jpg',
  'ролл филадельфия лайт с крабом': '/img/Филадельфия лайт с огурцом.jpg',
  'ролл запеченный мистер грин': '/img/miduei(1).PNG',
  'ролл сузуки': '/img/samurai.PNG',
  'ролл филадельфия с чукой': '/img/Филадельфия лайт с огурцом.jpg',
  'ролл филадельфия ред': '/img/Филадельфия лайт с огурцом.jpg',

  // === Добавки и соусы ===
  'васаби': '/img/wasabi.jpg',
  'васаби (20 г)': '/img/wasabi.jpg',
  'имбирь': '/img/ginger-pickled.jpg',
  'имбирь (30 г)': '/img/ginger-pickled.jpg',
  'соевый соус': '/img/soy-sauce.jpg',
  'соевый соус (40 мл)': '/img/soy-sauce.jpg',
  'соус спайси': '/img/sauce-spicy.jpg',
  'соус спайси 50г': '/img/sauce-spicy.jpg',
  'соус масаго': '/img/sauce-masago.jpg',
  'соус масаго 50г': '/img/sauce-masago.jpg',
  'соус унаги': '/img/sauce-unagi.jpg',
  'соус унаги 50г': '/img/sauce-unagi.jpg',
  'соус ореховый': '/img/sauce-peanut.jpg',
  'соус ореховый 50г': '/img/sauce-peanut.jpg',
  'соус свит чилли': '/img/sauce-sweet-chili.jpg',
  'соус свит чилли 50г': '/img/sauce-sweet-chili.jpg',
  'соус свит чили': '/img/sauce-sweet-chili.jpg',
  'свит чилли': '/img/sauce-sweet-chili.jpg',
  'свит чили': '/img/sauce-sweet-chili.jpg',

  // === Гунканы ===
  'гункан с жареным лососем': '/img/gunkan-salmon.jpg',
  'гункан с икрой масаго': '/img/gunkan-masago.jpg',
  'гункан с чукой': '/img/gunkan-chuka.jpg',
  'гункан спайси кани': '/img/gunkan-kani.jpg',
  'гункан унаги авокадо': '/img/gunkan-unagi.jpg',
};

/**
 * Нормализует название товара для поиска
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
 * Получает URL изображения для товара по названию
 * @param {string} productName - Название товара
 * @returns {string} - URL изображения или "/logo.jpg" как fallback
 */
export function getProductImage(productName) {
  const normalized = normalizeName(productName);

  // 1. Точное совпадение
  if (IMAGE_MAP[normalized]) {
    return IMAGE_MAP[normalized];
  }

  // 2. Частичное совпадение — ищем ключ внутри названия или наоборот
  const keys = Object.keys(IMAGE_MAP);
  for (const key of keys) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return IMAGE_MAP[key];
    }
  }

  return '/logo.jpg';
}
