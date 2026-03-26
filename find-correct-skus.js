// find-correct-skus.js - Поиск правильных SKU для товаров
const fs = require('fs');
const path = require('path');

// Чтение CSV
const csvContent = fs.readFileSync(path.join(__dirname, 'ФП скидки.csv'), 'utf8');
const lines = csvContent.split('\n').filter(line => line.trim());

const frontpadItems = [];
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split('\t');
  if (parts.length >= 4) {
    frontpadItems.push({
      category: parts[0].trim(),
      name: parts[1].trim(),
      price: parseInt(parts[2], 10),
      productId: parts[3] ? parseInt(parts[3], 10) : null
    });
  }
}

// Загрузка локальных SKU
const jsonFiles = [
  'public/холодные роллы/rolls.json',
  'public/запеченные роллы/zaproll.json',
  'public/сеты/set.json'
];

const localItems = [];
jsonFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  data.items.forEach(item => {
    localItems.push({
      name: item.name,
      sku: item.sku,
      price: item.price,
      source: file
    });
  });
});

// Функция нормализации названия для сравнения
function normalize(str) {
  return str.toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\wа-я\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

console.log('===========================================');
console.log('ПОИСК ПРАВИЛЬНЫХ PRODUCT_ID ДЛЯ ТОВАРОВ ИЗ JSON');
console.log('===========================================\n');

const problemSkus = ['411', '83', '420', '422', '382'];
const problemItems = localItems.filter(i => problemSkus.includes(String(i.sku)));

console.log('Проблемные товары из JSON:\n');
problemItems.forEach(item => {
  const normalizedName = normalize(item.name);
  
  // Ищем совпадение во Frontpad по названию
  const match = frontpadItems.find(fp => {
    const fpNorm = normalize(fp.name).replace(/\s*\*\s*$/, ''); // убираем * в конце
    return fpNorm === normalizedName || fpNorm.includes(normalizedName) || normalizedName.includes(fpNorm);
  });
  
  console.log(`❌ Товар: "${item.name}"`);
  console.log(`   JSON SKU: ${item.sku}, Цена: ${item.price}₽ [${item.source}]`);
  
  if (match) {
    console.log(`   ✅ НАЙДЕНО В FRONTPAD:`);
    console.log(`      Product ID: ${match.productId}`);
    console.log(`      Название: "${match.name}"`);
    console.log(`      Цена: ${match.price}₽`);
    console.log(`      Категория: ${match.category}`);
  } else {
    // Пробуем частичное совпадение
    const partialMatch = frontpadItems.find(fp => {
      const fpNorm = normalize(fp.name).replace(/\s*\*\s*$/, '');
      const words1 = normalizedName.split(' ');
      const words2 = fpNorm.split(' ');
      const commonWords = words1.filter(w => w.length > 3 && words2.includes(w));
      return commonWords.length >= 2;
    });
    
    if (partialMatch) {
      console.log(`   ⚠️  ВОЗМОЖНОЕ СОВПАДЕНИЕ:`);
      console.log(`      Product ID: ${partialMatch.productId}`);
      console.log(`      Название: "${partialMatch.name}"`);
      console.log(`      Цена: ${partialMatch.price}₽`);
    } else {
      console.log(`   ❌ НЕ НАЙДЕНО ВО FRONTPAD`);
    }
  }
  console.log('');
});

// Полная проверка всех товаров
console.log('\n===========================================');
console.log('ПОЛНАЯ ПРОВЕРКА ВСЕХ SKU');
console.log('===========================================\n');

let matched = 0;
let notMatched = 0;
const skuMapping = [];

localItems.forEach(item => {
  if (!item.sku) return;
  
  const normalizedName = normalize(item.name);
  const match = frontpadItems.find(fp => {
    const fpNorm = normalize(fp.name).replace(/\s*\*\s*$/, '');
    return fpNorm === normalizedName;
  });
  
  if (match && String(match.productId) === String(item.sku)) {
    matched++;
  } else if (match) {
    skuMapping.push({
      name: item.name,
      currentSku: item.sku,
      correctProductId: match.productId,
      priceLocal: item.price,
      priceFp: match.price
    });
  } else {
    notMatched++;
  }
});

console.log(`✅ Товаров с верным SKU: ${matched}`);
console.log(`⚠️  Товаров с неверным SKU: ${skuMapping.length}`);
console.log(`❌ Товаров не найдено: ${notMatched}`);

if (skuMapping.length > 0) {
  console.log('\n\nТОВАРЫ С НЕВЕРНЫМ SKU (нужно исправить в JSON):\n');
  skuMapping.forEach((m, i) => {
    console.log(`${i + 1}. "${m.name}"`);
    console.log(`   Текущий SKU: ${m.currentSku} → Правильный Product ID: ${m.correctProductId}`);
    console.log(`   Цена JSON: ${m.priceLocal}₽, Frontpad: ${m.priceFp}₽`);
  });
}
