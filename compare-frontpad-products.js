// compare-frontpad-products.js - Полное сравнение товаров с Frontpad по цене и ID
require('dotenv').config();

const { getProducts } = require('./api/_lib/frontpad');
const fs = require('fs');
const path = require('path');

// Все JSON файлы с товарами (обычные и подписочные)
const jsonFiles = [
  // Обычные товары
  'public/холодные роллы/rolls.json',
  'public/запеченные роллы/zaproll.json',
  'public/сеты/set.json',
  
  // Подписочные товары
  'public/подписка роллы/rolls-sub.json',
  'public/подписка сеты/sets-sub.json',
  'public/подписка запеченные/zaproll-sub.json',
  'public/подписка 490/rolls-490.json',
  'public/подписка 490/sets-490.json'
];

// Для хранения локальных товаров
const localSkus = new Map(); // sku -> { name, price, source, isSubscription }

// Загрузка товаров из JSON файлов
console.log('🔍 Загрузка товаров из JSON файлов...');

jsonFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Файл не найден: ${file}`);
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Определяем, является ли файл подписочным
    const isSubscription = file.includes('подписка');
    
    data.items.forEach(item => {
      if (item.sku !== null && item.sku !== undefined) {
        localSkus.set(String(item.sku), {
          name: item.name,
          price: item.price,
          source: file,
          isSubscription
        });
      }
    });
  } catch (error) {
    console.error(`❌ Ошибка загрузки файла ${file}:`, error.message);
  }
});

console.log(`\n📦 Загружено локальных товаров из JSON: ${localSkus.size}`);

async function comparePricesAndIds() {
  console.log('\n🔄 Загрузка товаров из Frontpad API...');
  
  const result = await getProducts();
  
  if (!result.success) {
    console.error('❌ Ошибка загрузки из Frontpad:', result.error);
    return;
  }
  
  const frontpadProducts = result.data;
  console.log(`📦 Загружено товаров из Frontpad: ${frontpadProducts.length}`);
  
  // Создаём мапу Frontpad product_id -> info
  const frontpadMap = new Map();
  frontpadProducts.forEach(p => {
    frontpadMap.set(String(p.id), {
      name: p.name,
      price: p.price,
      hasSale: p.hasSale
    });
  });
  
  // Категории для сравнения
  const matched = [];           // Товары, найденные и там и там
  const notInFrontpad = [];     // Есть в JSON, нет в Frontpad
  const notInJson = [];         // Есть в Frontpad, нет в JSON
  const priceMismatch = [];     // Расхождения в ценах
  const nameMismatch = [];      // Расхождения в названиях
  
  // Проверка товаров из JSON
  localSkus.forEach((info, sku) => {
    if (frontpadMap.has(sku)) {
      const frontpadInfo = frontpadMap.get(sku);
      const item = { sku, local: info, frontpad: frontpadInfo };
      
      matched.push(item);
      
      // Проверка цен
      if (Math.abs(info.price - frontpadInfo.price) > 1) {
        priceMismatch.push(item);
      }
      
      // Проверка названий
      const localName = info.name.toLowerCase().trim();
      const frontpadName = frontpadInfo.name.toLowerCase().trim();
      if (localName !== frontpadName) {
        nameMismatch.push(item);
      }
    } else {
      notInFrontpad.push({ sku, local: info });
    }
  });
  
  // Проверка товаров из Frontpad
  frontpadMap.forEach((info, productId) => {
    if (!localSkus.has(productId)) {
      notInJson.push({ productId, frontpad: info });
    }
  });
  
  // Статистика
  console.log('\n===========================================');
  console.log(`✅ Всего совпадений по ID: ${matched.length}`);
  console.log(`❌ Товаров в JSON, которых нет в Frontpad: ${notInFrontpad.length}`);
  console.log(`⚠️ Товаров в Frontpad, которых нет в JSON: ${notInJson.length}`);
  console.log(`💰 Расхождений в ценах: ${priceMismatch.length}`);
  console.log(`📝 Расхождений в названиях: ${nameMismatch.length}`);
  console.log('===========================================\n');
  
  // Детальный вывод расхождений
  
  // 1. Товары, которых нет в Frontpad
  if (notInFrontpad.length > 0) {
    console.log('\n❌ ТОВАРЫ ЕСТЬ В JSON, НО НЕТ В FRONTPAD:\n');
    
    // Группируем по категориям (подписка/обычные)
    const subscriptionItems = notInFrontpad.filter(item => item.local.isSubscription);
    const regularItems = notInFrontpad.filter(item => !item.local.isSubscription);
    
    if (regularItems.length > 0) {
      console.log(`   📋 ОБЫЧНЫЕ ТОВАРЫ (${regularItems.length}):`);
      regularItems.forEach(({ sku, local }) => {
        console.log(`     • SKU: ${sku} — "${local.name}" (${local.price}₽) [${local.source}]`);
      });
    }
    
    if (subscriptionItems.length > 0) {
      console.log(`\n   🔄 ТОВАРЫ ПОДПИСКИ (${subscriptionItems.length}):`);
      subscriptionItems.forEach(({ sku, local }) => {
        console.log(`     • SKU: ${sku} — "${local.name}" (${local.price}₽) [${local.source}]`);
      });
    }
  }
  
  // 2. Расхождения в ценах
  if (priceMismatch.length > 0) {
    console.log('\n💰 РАСХОЖДЕНИЯ В ЦЕНАХ:\n');
    
    // Группируем по категориям (подписка/обычные)
    const subscriptionItems = priceMismatch.filter(item => item.local.isSubscription);
    const regularItems = priceMismatch.filter(item => !item.local.isSubscription);
    
    if (regularItems.length > 0) {
      console.log(`   📋 ОБЫЧНЫЕ ТОВАРЫ (${regularItems.length}):`);
      regularItems.forEach(({ sku, local, frontpad }) => {
        const diff = local.price - frontpad.price;
        const diffText = diff > 0 ? `+${diff}` : diff;
        console.log(`     • SKU: ${sku} — "${local.name}"`);
        console.log(`       JSON: ${local.price}₽, Frontpad: ${frontpad.price}₽ (разница: ${diffText}₽)`);
      });
    }
    
    if (subscriptionItems.length > 0) {
      console.log(`\n   🔄 ТОВАРЫ ПОДПИСКИ (${subscriptionItems.length}):`);
      console.log('   ⚠️ Для товаров подписки могут быть нормальными расхождения в ценах, т.к. скидки применяются на фронтенде\n');
      subscriptionItems.forEach(({ sku, local, frontpad }) => {
        const diff = local.price - frontpad.price;
        const diffText = diff > 0 ? `+${diff}` : diff;
        console.log(`     • SKU: ${sku} — "${local.name}"`);
        console.log(`       JSON: ${local.price}₽, Frontpad: ${frontpad.price}₽ (разница: ${diffText}₽)`);
      });
    }
  }
  
  // 3. Расхождения в названиях
  if (nameMismatch.length > 0) {
    console.log('\n📝 РАСХОЖДЕНИЯ В НАЗВАНИЯХ:\n');
    
    // Группируем по категориям (подписка/обычные)
    const subscriptionItems = nameMismatch.filter(item => item.local.isSubscription);
    const regularItems = nameMismatch.filter(item => !item.local.isSubscription);
    
    if (regularItems.length > 0) {
      console.log(`   📋 ОБЫЧНЫЕ ТОВАРЫ (${regularItems.length}):`);
      regularItems.slice(0, 15).forEach(({ sku, local, frontpad }) => {
        console.log(`     • SKU: ${sku}`);
        console.log(`       JSON:     "${local.name}"`);
        console.log(`       Frontpad: "${frontpad.name}"`);
      });
      if (regularItems.length > 15) {
        console.log(`     ...и ещё ${regularItems.length - 15} товаров`);
      }
    }
    
    if (subscriptionItems.length > 0) {
      console.log(`\n   🔄 ТОВАРЫ ПОДПИСКИ (${subscriptionItems.length}):`);
      subscriptionItems.slice(0, 15).forEach(({ sku, local, frontpad }) => {
        console.log(`     • SKU: ${sku}`);
        console.log(`       JSON:     "${local.name}"`);
        console.log(`       Frontpad: "${frontpad.name}"`);
      });
      if (subscriptionItems.length > 15) {
        console.log(`     ...и ещё ${subscriptionItems.length - 15} товаров`);
      }
    }
  }
  
  // 4. Товары из Frontpad, которых нет в JSON
  if (notInJson.length > 0) {
    console.log(`\n⚠️ ТОВАРЫ ЕСТЬ В FRONTPAD, НО НЕТ В JSON (первые 20):\n`);
    notInJson.slice(0, 20).forEach(({ productId, frontpad }) => {
      console.log(`   • ID: ${productId} — "${frontpad.name}" (${frontpad.price}₽)`);
    });
    if (notInJson.length > 20) {
      console.log(`   ...и ещё ${notInJson.length - 20} товаров`);
    }
  }
  
  // Сохраняем отчёт в CSV
  generateCsvReport(matched, notInFrontpad, notInJson, priceMismatch);
  
  console.log('\n===========================================');
  console.log('✅ Проверка завершена! Отчёт сохранен в frontpad-comparison.csv');
  console.log('===========================================\n');
}

// Функция для генерации CSV-отчёта
function generateCsvReport(matched, notInFrontpad, notInJson, priceMismatch) {
  // Создаем заголовок CSV
  let csv = 'Тип,SKU,Название в JSON,Цена в JSON,Источник,Название во Frontpad,Цена во Frontpad,Разница в цене\n';
  
  // Добавляем расхождения в ценах
  priceMismatch.forEach(({ sku, local, frontpad }) => {
    const diff = local.price - frontpad.price;
    const type = local.isSubscription ? 'Подписка' : 'Обычный';
    csv += `Расхождение в цене,${sku},"${local.name}",${local.price},${local.source},"${frontpad.name}",${frontpad.price},${diff}\n`;
  });
  
  // Добавляем товары, которых нет в Frontpad
  notInFrontpad.forEach(({ sku, local }) => {
    const type = local.isSubscription ? 'Подписка' : 'Обычный';
    csv += `Отсутствует во Frontpad,${sku},"${local.name}",${local.price},${local.source},"",0,0\n`;
  });
  
  // Добавляем товары, которых нет в JSON (только первые 50)
  notInJson.slice(0, 50).forEach(({ productId, frontpad }) => {
    csv += `Отсутствует в JSON,${productId},"",0,,"${frontpad.name}",${frontpad.price},0\n`;
  });
  
  // Записываем CSV-файл
  fs.writeFileSync('frontpad-comparison.csv', csv, 'utf8');
}

comparePricesAndIds().catch(console.error);