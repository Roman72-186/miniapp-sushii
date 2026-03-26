// update-skus-manual.js - Обновление SKU по данным из CSV
const fs = require('fs');
const path = require('path');

// Данные из CSV (Название → Product ID)
const csvData = `Авокадо маки;1105
Аге гурме;1106
Аляска кунсей;1107
Бонито мидии;1145
Бонито тунец;1146
Бруклин;1109
Гранд лосось;1193
Гуччи;1110
Детройт;1111
Дракон лайт;1112
Запеченный лайт;1147
Калифорния;1114
Калифорния с лососем;1150
Каппа маки;1116
Кето лосось-креветки;1194
Кето лосось-тунец;1195
Кето ролл с тунцом;1196
Кето-лосось;1197
Киото чикен;1151
Королевский;1198
Красная Москва;1199
Манхеттен;1117
Мидии терияки;1152
Миндальная филадельфия;1200
Монте Карло;1153
Нежный поцелуй;1118
Поке с курицей;1143
Розовый;1119
Сказочный тунец;1155
Спайси эби маки;1120
Суп Мисо гурме;1144
Суши сендвич с жареным лососем;1202
Суши сендвич с лососем;1201
Сяке кунсей маки;1121
Сяке маки;1203
Сяке ясай;1158
Тилапийский дракон;1159
Туна маки;1122
Туна фреш;1160
Унаги маки;1123
Унаги онигара;1204
Филадельфия без нори;1205
Филадельфия лайт с огурцом;1126
Филадельфия премиум;1206
Филадельфия с авокадо;1207
Филадельфия с огурцом;1208
Филадельфия сливочная;1209
Фреш ролл;1128
Царская фила том-ям;1210
Царский тунец;1211
Чеддер скин ролл;1161
Чёрная жемчужина;1212
Чизи эби;1162
Чикен лав;1130
Чикен фиера;1163
Чука маки;1213
Шанель;1214
Шёлковый путь;1132
Эби дрим;1164
Эби свит чили;1165
Эби спайси;1166
Горячий Дон жуан;1179
Запеченный Мидуэй;1134
Запеченный ролл с беконом;1181
Запеченный ролл с угрем;1182
Запеченный тори ролл;1148
Кани гриль;1136
Клеопатра;1184
Краб дуэт гриль;1137
Мидии маки гриль;1183
Ниагара;1139
Суши-пицца креветки;1186
Суши-пицца курица;1140
Суши-пицца лосось;1185
Сяке кани гриль;1187
Сяке кунсей гриль;1188
Сяке терияки;1156
Сяке хот;1157
Тёплый ролл с лососем;1189
Туна гриль;1141
Фила эби гриль;1190
Чикен гриль;1142
Эби гриль;1191
Эби кани гриль;1192
Яки сяке хот;1167
сет Богемия;1071
сет Дамский угодник;1074
сет Дары поднебесной;1102
сет Джонни Д;1075
сет Джуниор;1076
сет Домино;1079
сет Душевное спокойствие;1097
сет Жаркая осень;1080
сет Квартет удовольствия;1098
сет Коби Брайант;1081
сет Любимый;1082
сет Мамина радость;1083
сет На дружную компания;1084
сет Ниватори Шива;1100
сет Олимпия;1085
сет Премиум лайт;1088
сет Сердца трех;1089
сет Сливочный;1090
сет Теплое удовольствие;1091
сет Токийский дрифт;1103
сет Филадельфия люкс;1093
сет Хоккайдо;1104
сет Эксклюзив;1095
Тёплый лосось микс;1101
Трипл сет;1096
Бархатный тунец;381
Благородный Сёгун;341
Гламур;309
Дракон;19
Загадка Индии;340
Канада 119;311
Кето лосось-креветка;313
Ролл с тар-таром из тунца;398
Самура ролл;399
Самурай;46
Суши сэндвич с жареным лососем;126
Суши сэндвич с лососем;127
Таинственный гребешок;351
Тропическая гармония;414
Чёрная жемчужина;350
Шёлковый путь;346
Запечённый лосось файр;317
Запечённый Мидзуи;22
Суши пицца №1;124
Суши пицца №2;125
Суши пицца №3;327
Тёплый ролл с лососем;116
сет Богемия;328
сет Дамский угодник;49
сет Дары поднебесной;405
сет Джонни Д;330
сет Домино;50
сет Душевное спокойствие;400
сет Жаркая осень;51
сет Квартет удовольствия;401
сет Коби Брайант;102
сет Любимый;103
сет Мамина радость;331
сет На дружную компанию;325
сет Ниваторы Шива;403
сет Олимпия;56
сет Премиум лайт;57
сет Сердца Трёх;60
сет Сливочный;61
сет Тёплое Удовольствие;62
сет Токийский дрифт;412
сет Филадельфия люкс;65
сет Хоккайдо;406
сет Эксклюзив;334
Тёплый лосось микс;404`;

// Создаём мапу: название → product_id
const nameToProductId = new Map();
csvData.split('\n').forEach(line => {
  const parts = line.trim().split(';');
  if (parts.length === 2) {
    const name = parts[0].trim().toLowerCase();
    const productId = parts[1].trim();
    nameToProductId.set(name, productId);
  }
});

console.log(`Загружено ${nameToProductId.size} товаров из CSV\n`);

// Функция нормализации названия
function normalize(name) {
  return name.toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .replace(/^сет\s*/i, '') // убираем "сет" в начале
    .trim();
}

// JSON файлы для обновления
const jsonFiles = [
  'public/холодные роллы/rolls.json',
  'public/запеченные роллы/zaproll.json',
  'public/сеты/set.json'
];

let totalUpdated = 0;
let totalNotFound = 0;
const notFoundItems = [];

jsonFiles.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const data = JSON.parse(content);
  
  let updated = 0;
  let notFound = 0;
  
  data.items.forEach(item => {
    if (item.sku === null || item.sku === undefined) {
      notFound++;
      notFoundItems.push({ name: item.name, source: filePath, currentSku: null });
      console.log(`⚪ ${filePath}: "${item.name}" — пропущено (sku: null)`);
      return;
    }
    
    const normalizedName = normalize(item.name);
    
    // Ищем совпадение в CSV
    let productId = null;
    
    // Прямое совпадение
    if (nameToProductId.has(normalizedName)) {
      productId = nameToProductId.get(normalizedName);
    }
    
    // Пробуем с "сет"
    if (!productId && item.name.toLowerCase().startsWith('сет ')) {
      const nameWithSet = normalize(item.name).replace(/^сет\s*/, 'сет ');
      if (nameToProductId.has(nameWithSet)) {
        productId = nameToProductId.get(nameWithSet);
      }
    }
    
    // Пробуем без "сет"
    if (!productId) {
      const nameWithoutSet = normalizedName.replace(/^сет\s*/, '');
      if (nameToProductId.has(nameWithoutSet)) {
        productId = nameToProductId.get(nameWithoutSet);
      }
    }
    
    if (productId) {
      const oldSku = item.sku;
      item.sku = String(productId);
      
      if (String(oldSku) !== String(productId)) {
        updated++;
        totalUpdated++;
        console.log(`✅ ${filePath}: "${item.name}"`);
        console.log(`   SKU: ${oldSku} → ${productId}`);
      }
    } else {
      notFound++;
      totalNotFound++;
      notFoundItems.push({ name: item.name, source: filePath, currentSku: item.sku });
      console.log(`❌ ${filePath}: "${item.name}" — НЕ НАЙДЕНО (SKU: ${item.sku})`);
    }
  });
  
  // Сохраняем обновлённый файл
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
  
  console.log(`\n📊 ${filePath}: обновлено ${updated}, не найдено ${notFound}\n`);
});

console.log('\n===========================================');
console.log(`ИТОГО: обновлено ${totalUpdated}, не найдено ${totalNotFound}`);
console.log('===========================================\n');

if (notFoundItems.length > 0) {
  console.log('Товары, для которых не найдены SKU:\n');
  notFoundItems.forEach(item => {
    console.log(`  "${item.name}" [${item.source}] (текущий SKU: ${item.currentSku})`);
  });
}
