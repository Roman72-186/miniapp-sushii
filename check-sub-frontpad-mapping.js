// check-sub-frontpad-mapping.js - Проверка соответствия SKU подписок и Frontpad product_id
require('dotenv').config();

const { getProducts } = require('./api/_lib/frontpad');

const fs = require('fs');
const path = require('path');

const jsonFiles = [
  'public/подписка роллы/rolls-sub.json',
  'public/подписка сеты/sets-sub.json',
  'public/подписка запеченные/zaproll-sub.json',
  'public/подписка 490/rolls-490.json',
  'public/подписка 490/sets-490.json'
];

const localSkus = new Map(); // sku -> name

jsonFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Файл не найден: ${file}`);
    return;
  }
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

console.log(`\n📦 Локальных SKU подписок в JSON: ${localSkus.size}`);

async function checkMapping() {
  console.log('\n🔄 Загрузка товаров из Frontpad API...\n');
  
  const result = await getProducts();
  
  if (!result.success) {
    console.error('❌ Ошибка загрузки из Frontpad:', result.error);
    return;
  }
  
  const frontpadProducts = result.data;
  console.log(`📦 Товаров в Frontpad: ${frontpadProducts.length}`);
  
  const frontpadMap = new Map();
  frontpadProducts.forEach(p => {
    frontpadMap.set(String(p.id), {
      name: p.name,
      price: p.price,
      hasSale: p.hasSale
    });
  });
  
  const matched = [];
  const notInFrontpad = []; // Есть в JSON, нет в Frontpad
  
  localSkus.forEach((info, sku) => {
    if (frontpadMap.has(sku)) {
      matched.push({ sku, local: info, frontpad: frontpadMap.get(sku) });
    } else {
      notInFrontpad.push({ sku, local: info });
    }
  });
  
  console.log('\n===========================================');
  console.log(`✅ Совпадений SKU: ${matched.length}`);
  console.log(`❌ SKU в JSON, которых НЕТ во Frontpad: ${notInFrontpad.length}`);
  console.log('===========================================\n');
  
  if (notInFrontpad.length > 0) {
    console.log('\n❌ ОШИБКА: ТОВАРЫ ПОДПИСКИ ЕСТЬ В JSON, НО ИХ ID (SKU) НЕТ В FRONTPAD:\n');
    notInFrontpad.forEach(({ sku, local }) => {
      console.log(`  SKU: ${sku} — "${local.name}" (${local.price}₽) [${local.source}]`);
    });
  } else {
    console.log('✅ Все SKU товаров подписки найдены во Frontpad!');
  }
  
  // Проверка расхождений в ценах (для подписки цены в JSON - это базовые цены, скидка применяется на фронтенде, но можно посмотреть разницу)
  const priceMismatch = matched.filter(m => Math.abs(m.local.price - m.frontpad.price) > 1);
  if (priceMismatch.length > 0) {
    console.log(`\n💰 РАСХОЖДЕНИЯ В ЦЕНАХ БАЗЫ (${priceMismatch.length}) [В JSON базовые цены, в Frontpad могут быть акционные]:\n`);
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
