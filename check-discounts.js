// check-discounts.js - Проверка скидок из Frontpad
const fs = require('fs');
const path = require('path');
const { getProducts } = require('./api/_lib/frontpad');

// Чтение CSV в кодировке Windows-1251
const csvContent = fs.readFileSync(path.join(__dirname, 'ФП скидки.csv'), 'latin1');
const lines = csvContent.split('\r\n').filter(line => line.trim());

// Парсинг CSV (разделитель ;)
const headers = lines[0].split(';');
console.log('Заголовки CSV:', headers);

const frontpadItems = [];
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(';');
  if (parts.length >= 4) {
    frontpadItems.push({
      category: parts[0],
      name: parts[1],
      discount: parseInt(parts[2], 10),
      productId: parts[3] ? parseInt(parts[3], 10) : null
    });
  }
}

console.log(`\n📦 Товаров в CSV "ФП скидки": ${frontpadItems.length}`);

// Группировка по категории
const byCategory = {};
frontpadItems.forEach(item => {
  if (!byCategory[item.category]) {
    byCategory[item.category] = [];
  }
  byCategory[item.category].push(item);
});

console.log('\n📊 Категории в CSV:');
Object.keys(byCategory).forEach(cat => {
  console.log(`  ${cat}: ${byCategory[cat].length} товаров`);
});

// Загрузка локальных SKU
const jsonFiles = [
  'public/холодные роллы/rolls.json',
  'public/запеченные роллы/zaproll.json',
  'public/сеты/set.json'
];

const localSkus = new Map();
jsonFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  data.items.forEach(item => {
    if (item.sku !== null && item.sku !== undefined) {
      localSkus.set(String(item.sku), {
        name: item.name,
        price: item.price,
        source: file
      });
    }
  });
});

console.log(`\n📦 Локальных SKU в JSON: ${localSkus.size}`);

// Загрузка товаров из Frontpad
async function checkDiscounts() {
  console.log('\n🔄 Загрузка товаров из Frontpad API...\n');
  
  const result = await getProducts();
  
  if (!result.success) {
    console.error('❌ Ошибка загрузки из Frontpad:', result.error);
    return;
  }
  
  const frontpadProducts = result.data;
  const frontpadMap = new Map();
  frontpadProducts.forEach(p => {
    frontpadMap.set(String(p.id), {
      name: p.name,
      price: p.price,
      hasSale: p.hasSale
    });
  });
  
  console.log(`📦 Товаров в Frontpad API: ${frontpadProducts.length}\n`);
  
  // Проверка: товары из CSV есть ли в Frontpad и в JSON
  console.log('===========================================');
  console.log('ПРОВЕРКА ТОВАРОВ ИЗ "ФП скидки.csv"');
  console.log('===========================================\n');
  
  const csvProductIds = frontpadItems.filter(i => i.productId).map(i => String(i.productId));
  const uniqueProductIds = [...new Set(csvProductIds)];
  
  let inFrontpad = 0;
  let inJson = 0;
  let notInFrontpad = [];
  let notInJson = [];
  
  uniqueProductIds.forEach(productId => {
    const inFp = frontpadMap.has(productId);
    const inJ = localSkus.has(productId);
    
    if (inFp) inFrontpad++;
    else notInFrontpad.push(productId);
    
    if (inJ) inJson++;
    else notInJson.push(productId);
  });
  
  console.log(`Уникальных product_id в CSV: ${uniqueProductIds.length}`);
  console.log(`✅ Есть в Frontpad API: ${inFrontpad}`);
  console.log(`✅ Есть в локальных JSON: ${inJson}`);
  
  if (notInFrontpad.length > 0) {
    console.log(`\n❌ Нет в Frontpad API (${notInFrontpad.length}):`);
    notInFrontpad.slice(0, 10).forEach(id => {
      const item = frontpadItems.find(i => String(i.productId) === id);
      console.log(`  ID: ${id} — "${item?.name || 'неизвестно'}"`);
    });
  }
  
  if (notInJson.length > 0) {
    console.log(`\n❌ Нет в локальных JSON (${notInJson.length}):`);
    notInJson.slice(0, 10).forEach(id => {
      const item = frontpadItems.find(i => String(i.productId) === id);
      console.log(`  ID: ${id} — "${item?.name || 'неизвестно'}" (скидка: ${item?.discount}₽)`);
    });
  }
  
  // Проверка скидок
  console.log('\n===========================================');
  console.log('ТОВАРЫ СО СКИДКОЙ (из Frontpad API с sale=1)');
  console.log('===========================================\n');
  
  const saleProducts = frontpadProducts.filter(p => p.hasSale);
  console.log(`Товаров со скидкой в Frontpad: ${saleProducts.length}\n`);
  
  // Какие из них есть в JSON
  const saleInJson = saleProducts.filter(p => localSkus.has(String(p.id)));
  const saleNotInJson = saleProducts.filter(p => !localSkus.has(String(p.id)));
  
  console.log(`✅ Из них есть в JSON: ${saleInJson.length}`);
  console.log(`❌ Из них нет в JSON: ${saleNotInJson.length}\n`);
  
  if (saleNotInJson.length > 0) {
    console.log('Товары со скидкой, которых нет в JSON (первые 15):');
    saleNotInJson.slice(0, 15).forEach(p => {
      console.log(`  ID: ${p.id} — "${p.name}" (${p.price}₽)`);
    });
  }
  
  // Проверка 5 проблемных товаров (которые есть в JSON, но нет в Frontpad)
  console.log('\n===========================================');
  console.log('ПРОБЛЕМНЫЕ ТОВАРЫ (есть в JSON, нет в Frontpad)');
  console.log('===========================================\n');
  
  const problemSkus = ['411', '83', '420', '422', '382'];
  problemSkus.forEach(sku => {
    const local = localSkus.get(sku);
    if (local) {
      console.log(`❌ SKU: ${sku} — "${local.name}" (${local.price}₽) [${local.source}]`);
    }
  });
  
  console.log('\n===========================================\n');
}

checkDiscounts().catch(console.error);
