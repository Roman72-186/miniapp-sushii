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
  'краб дуэт гриль': '/new_roll/Краб дуэт гриль.jpg',
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
  'спайси эби маки': '/new_roll/Спайси Эби маки.jpg',
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

  // === Сеты ===
  'сет брюс ли': '/img/sets/set_bruce_lee.jpg',
  'сет гармония классики': '/img/sets/set_garmoniya.jpg',
  'сет дамский угодник': '/img/sets/set_damskiy_ugodnik.jpg',
  'сет домино': '/img/sets/set_domino.jpg',
  'сет игра престолов': '/img/sets/set_igra_prestolov.jpg',
  'сет олимпия': '/img/sets/set_olimpiya.jpg',
  'сет жаркая осень': '/img/sets/set_zharkaya_osen.jpg',
  'сет сливочный': '/img/sets/set_slivochniy.jpg',
  'теплый лосось микс': '/img/sets/set_tepliy_losos.jpg',
  'сет теплый лосось микс': '/img/sets/set_tepliy_losos.jpg',
  'трипл сет': '/img/sets/set_tripl.jpg',
  'сет трипл': '/img/sets/set_tripl.jpg',
  'сет богемия': '/img/sets/set_bogemia.jpg',
  'сет джонни д': '/img/sets/set_dzhonni_d.jpg',
  'сет любимый': '/img/sets/set_lyubimiy.jpg',
  'сет мамина радость': '/img/sets/set_mamina_radost.jpg',
  'сет премиум лайт': '/img/sets/set_premium_layt.jpg',
  'сет сердца трех': '/img/sets/set_serdca_treh.jpg',
  'сет квартет удовольствия': '/img/sets/set_kvartet.jpg',
  'сет токийский дрифт': '/img/sets/set_tokiyskiy_drift.jpg',
  'сет хоккайдо': '/img/sets/set_hokkaydo.jpg',
  'сет еклипс': '/img/sets/set_eklips.jpg',
  'сет теплое удовольствие': '/img/sets/set_teploe.jpg',
  'сет балтийский берег': '/img/sets/set_baltiyskiy_bereg.jpg',
  'сет большой и вкусный сет': '/img/sets/set_bolshoy.jpg',
  'сет гагарин': '/img/sets/set_gagarin.jpg',
  'сет добрый': '/img/sets/set_dobriy.jpg',
  'сет индиана джонс': '/img/sets/set_indiana.jpg',
  'сет ломоносов': '/img/sets/set_lomonosov.jpg',
  'сет романтик': '/img/sets/set_romantik.jpg',
  'сет роял': '/img/sets/set_royal.jpg',
  'сет унесенные ветром': '/img/sets/set_unesennye.jpg',

  // === Добавки и соусы — используется логотип-заглушка (/logo.jpg через fallback) ===

  // === Гунканы ===
  'гункан с жареным лососем': '/new_roll/Гункан с жареным лососем.jpg',
  'гункан с икрой масаго': '/new_roll/Гункан с икрой масаго.jpg',
  'гункан с чукой': '/new_roll/Гункан с чукой.jpg',
  'гункан спайси кани': '/new_roll/Гункан спайси кани.jpg',
  'гункан унаги авокадо': '/new_roll/Гункан унаги авокадо.jpg',

  // === Новые фото (new_roll/) — холодные роллы ===
  'гранд лосось': '/new_roll/Гранд Лосось.jpg',
  'сказочный тунец': '/new_roll/Сказочный Тунец.jpg',
  'красная москва': '/new_roll/Красная Москва.jpg',
  'миндальная филадельфия': '/new_roll/Миндальная Филадельфия.jpg',
  'королевский': '/new_roll/Королевский.jpg',
  'дракон лайт': '/new_roll/Дракон Лайт.jpg',
  'черная жемчужина': '/new_roll/Чёрная жемчужина.jpg',
  'унаги онигара': '/new_roll/Унаги Онигара.jpg',
  'царский тунец': '/new_roll/Царский тунец.jpg',
  'царская фила том ям': '/new_roll/Царская фила Том Ям.jpg',

  // === Новые фото (new_roll/) — запечённые роллы ===
  'запеченный ролл с угрем': '/new_roll/Запеченный ролл с угрём.jpg',
  'клеопатра': '/new_roll/Клеопатра.jpg',
  'сяке кунсей гриль': '/new_roll/Сяке кунсей гриль.jpg',
  'сяке терияки': '/new_roll/Сяке терияки.jpg',
  'сяке хот': '/new_roll/Сяке хот.jpg',
  'теплый ролл с лососем': '/new_roll/Тёплый ролл с лососем.jpg',
  'туна гриль': '/new_roll/Туна гриль.jpg',
  'фила эби гриль': '/new_roll/Фила Эби гриль.jpg',
  'чиззи эби': '/new_roll/Чиззи Эби.jpg',
  'эби гриль': '/new_roll/Эби гриль.jpg',
  'яки сяки хот': '/new_roll/Яки сяки хот.jpg',
  'яки сяке хот': '/new_roll/Яки сяки хот.jpg',

  // === Новые фото (new_roll/) — Филадельфия ===
  'филадельфия без нори': '/new_roll/Филадельфия без нори.jpg',
  'филадельфия люкс': '/new_roll/Филадельфия Люкс.jpg',
  'филадельфия премиум': '/new_roll/Филадельфия премиум.jpg',
  'филадельфия с авокадо': '/new_roll/Филадельфия с авокадо.jpg',
  'филадельфия с огурцом': '/new_roll/Филадельфия с огурцом.jpg',
  'филадельфия сливочная': '/new_roll/Филадельфия сливочная.jpg',

  // === Новые фото (new_roll/) — суши ===
  'суши пицца': '/new_roll/Суши пицца.jpg',
  'суши сендвич с жареным лососем': '/new_roll/Суши сендвич с жареным лососем.jpg',
  'суши-сендвич с жареным лососем': '/new_roll/Суши сендвич с жареным лососем.jpg',

  // === Новые фото (new_roll/) — сеты ===
  'сет коби брайант': '/new_roll/Сет Коби Брайант.jpg',
  'коби брайант': '/new_roll/Сет Коби Брайант.jpg',
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

// Предвычисленный словарь с нормализованными ключами (строится один раз)
// Нужен потому что normalizeName заменяет э→е, а ключи могут содержать э
const _NORMALIZED_MAP = Object.fromEntries(
  Object.entries(IMAGE_MAP).map(([k, v]) => [normalizeName(k), v])
);

/**
 * Получает URL изображения для товара по названию
 * @param {string} productName - Название товара
 * @returns {string} - URL изображения или "/logo.jpg" как fallback
 */
export function getProductImage(productName) {
  const normalized = normalizeName(productName);

  // 1. Точное совпадение (по нормализованным ключам)
  if (_NORMALIZED_MAP[normalized]) {
    return _NORMALIZED_MAP[normalized];
  }

  // 2. Частичное совпадение — ищем ключ внутри названия или наоборот
  const keys = Object.keys(_NORMALIZED_MAP);
  for (const key of keys) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return _NORMALIZED_MAP[key];
    }
  }

  return '/logo.jpg';
}
