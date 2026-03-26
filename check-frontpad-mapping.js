// check-frontpad-mapping.js - Проверка соответствия SKU и Frontpad product_id
require('dotenv').config();

const { getProducts } = require('./api/_lib/frontpad');

// Загрузка SKU из JSON-файлов
const fs = require('fs');
const path = require('path');

const jsonFiles = [
  'public/холодные роллы/rolls.json',
  'public/запеченные роллы/zaproll.json',
  'public/сеты/set.json'
];

const localSkus = new Map(); // sku -> name

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

async function checkMapping() {
  console.log('\n🔄 Загрузка товаров из Frontpad API...\n');
  
  const result = await getProducts();
  
  if (!result.success) {
    console.error('❌ Ошибка загрузки из Frontpad:', result.error);
    return;
  }
  
  const frontpadProducts = result.data;
  console.log(`📦 Товаров в Frontpad: ${frontpadProducts.length}`);
  
  // Создаём мапу Frontpad product_id -> name
  const frontpadMap = new Map();
  frontpadProducts.forEach(p => {
    frontpadMap.set(String(p.id), {
      name: p.name,
      price: p.price,
      hasSale: p.hasSale
    });
  });
  
  // Проверяем соответствие
  const matched = [];
  const notInFrontpad = []; // Есть в JSON, нет в Frontpad
  const notInJson = [];     // Есть в Frontpad, нет в JSON
  
  localSkus.forEach((info, sku) => {
    if (frontpadMap.has(sku)) {
      matched.push({ sku, local: info, frontpad: frontpadMap.get(sku) });
    } else {
      notInFrontpad.push({ sku, local: info });
    }
  });
  
  // Проверяем, есть ли во Frontpad товары, которых нет в локальных JSON
  frontpadMap.forEach((info, productId) => {
    if (!localSkus.has(productId)) {
      notInJson.push({ productId, frontpad: info });
    }
  });
  
  // Вывод результатов
  console.log('\n===========================================');
  console.log(`✅ Совпадений: ${matched.length}`);
  console.log(`❌ Есть в JSON, нет в Frontpad: ${notInFrontpad.length}`);
  console.log(`️  Есть в Frontpad, нет в JSON: ${notInJson.length}`);
  console.log('===========================================\n');
  
  if (notInFrontpad.length > 0) {
    console.log('\n❌ ТОВАРЫ ЕСТЬ В JSON, НО НЕТ В FRONTPAD:\n');
    notInFrontpad.forEach(({ sku, local }) => {
      console.log(`  SKU: ${sku} — "${local.name}" (${local.price}₽) [${local.source}]`);
    });
  }
  
  if (notInJson.length > 0) {
    console.log(`\n⚠️  ТОВАРЫ ЕСТЬ В FRONTPAD, НО НЕТ В JSON (первые 20):\n`);
    notInJson.slice(0, 20).forEach(({ productId, frontpad }) => {
      console.log(`  ID: ${productId} — "${frontpad.name}" (${frontpad.price}₽)`);
    });
    if (notInJson.length > 20) {
      console.log(`  ... и ещё ${notInJson.length - 20} товаров`);
    }
  }
  
  // Проверка расхождений в ценах
  const priceMismatch = matched.filter(m => Math.abs(m.local.price - m.frontpad.price) > 1);
  if (priceMismatch.length > 0) {
    console.log(`\n💰 РАСХОЖДЕНИЯ В ЦЕНАХ (${priceMismatch.length}):\n`);
    priceMismatch.slice(0, 10).forEach(({ sku, local, frontpad }) => {
      console.log(`  SKU: ${sku} — "${local.name}": JSON=${local.price}₽, Frontpad=${frontpad.price}₽`);
    });
  }
  
  // Проверка расхождений в названиях
  const nameMismatch = matched.filter(m => {
    const localNorm = m.local.name.toLowerCase().trim();
    const frontpadNorm = m.frontpad.name.toLowerCase().trim();
    return localNorm !== frontpadNorm;
  });
  if (nameMismatch.length > 0) {
    console.log(`\n📝 РАСХОЖДЕНИЯ В НАЗВАНИЯХ (${nameMismatch.length}):\n`);
    nameMismatch.slice(0, 10).forEach(({ sku, local, frontpad }) => {
      console.log(`  SKU: ${sku}`);
      console.log(`    JSON:     "${local.name}"`);
      console.log(`    Frontpad: "${frontpad.name}"`);
    });
  }
  
  console.log('\n===========================================\n');
}

checkMapping().catch(console.error);
