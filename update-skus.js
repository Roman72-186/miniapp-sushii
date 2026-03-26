// update-skus.js - Обновление SKU в JSON на правильные product_id из Frontpad
const fs = require('fs');
const path = require('path');

// Чтение CSV
const csvContent = fs.readFileSync(path.join(__dirname, 'ФП скидки.csv'), 'utf8');
const lines = csvContent.split('\n').filter(line => line.trim());

// Создаём мапу: название → product_id
const nameToProductId = new Map();
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split('\t');
  if (parts.length >= 4) {
    const name = parts[1].trim();
    const productId = parts[3] ? parseInt(parts[3], 10) : null;
    
    // Убираем звёздочки и лишние пробелы для сравнения
    const normalizedName = name.replace(/\s*\*+\s*$/g, '').trim();
    if (productId) {
      nameToProductId.set(normalizedName.toLowerCase(), productId);
    }
  }
}

console.log(`Загружено ${nameToProductId.size} товаров из CSV\n`);

// JSON файлы для обновления
const jsonFiles = [
  'public/холодные роллы/rolls.json',
  'public/запеченные роллы/zaproll.json',
  'public/сеты/set.json'
];

// Функция нормализации названия
function normalize(name) {
  return name.toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

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
    const normalizedName = normalize(item.name);
    
    // Ищем совпадение в CSV
    let productId = null;
    
    // Прямое совпадение
    if (nameToProductId.has(normalizedName)) {
      productId = nameToProductId.get(normalizedName);
    }
    
    // Если не найдено, пробуем без "сет" в начале
    if (!productId) {
      const altName = normalizedName.replace(/^сет\s*/, '');
      if (nameToProductId.has(altName)) {
        productId = nameToProductId.get(altName);
      }
    }
    
    // Если не найдено, пробуем по ключевым словам
    if (!productId) {
      const keywords = normalizedName.split(' ').filter(w => w.length > 3 && w !== 'сет');
      for (const [csvName, csvId] of nameToProductId.entries()) {
        const csvWords = csvName.split(' ');
        const matches = keywords.filter(kw => csvWords.includes(kw));
        if (matches.length >= Math.max(2, Math.floor(keywords.length / 2))) {
          productId = csvId;
          break;
        }
      }
    }
    
    if (productId) {
      const oldSku = item.sku;
      item.sku = String(productId);
      
      if (String(oldSku) !== String(productId)) {
        updated++;
        console.log(`✅ ${filePath}: "${item.name}"`);
        console.log(`   SKU: ${oldSku} → ${productId}`);
      }
    } else {
      notFound++;
      notFoundItems.push({ name: item.name, source: filePath, currentSku: item.sku });
      console.log(`❌ ${filePath}: "${item.name}" — НЕ НАЙДЕНО (SKU: ${item.sku})`);
    }
  });
  
  // Сохраняем обновлённый файл
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
  
  totalUpdated += updated;
  totalNotFound += notFound;
  
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
