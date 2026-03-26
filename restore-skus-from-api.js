// restore-skus-from-api.js - Восстановление SKU из Frontpad API
const fs = require('fs');
const path = require('path');
const { getProducts } = require('./api/_lib/frontpad');

async function restoreSkus() {
  // Загружаем товары из Frontpad
  const result = await getProducts();
  
  if (!result.success) {
    console.error('Ошибка загрузки из Frontpad:', result.error);
    return;
  }
  
  const frontpadProducts = result.data;
  
  // Создаём мапу: название (нормализованное) → product_id
  const frontpadMap = new Map();
  
  function normalize(name) {
    return name.toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/\s+/g, ' ')
      .replace(/\s*\*+\s*$/g, '') // убираем звёздочки в конце
      .replace(/^сет\s*/i, '') // убираем "сет" в начале для сравнения
      .trim();
  }
  
  frontpadProducts.forEach(p => {
    const norm = normalize(p.name);
    frontpadMap.set(norm, String(p.id));
    
    // Добавляем альтернативные варианты
    if (p.name.toLowerCase().startsWith('сет ')) {
      frontpadMap.set(norm.replace(/^сет\s*/, ''), String(p.id));
    }
  });
  
  console.log(`Загружено ${frontpadProducts.length} товаров из Frontpad\n`);
  
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
      const itemName = normalize(item.name);
      
      // Ищем совпадение в Frontpad
      let productId = frontpadMap.get(itemName);
      
      // Если не найдено, пробуем с "сет"
      if (!productId && item.name.toLowerCase().startsWith('сет ')) {
        productId = frontpadMap.get('сет ' + itemName);
      }
      
      // Если не найдено, пробуем без "сет"
      if (!productId) {
        productId = frontpadMap.get(itemName.replace(/^сет\s*/, ''));
      }
      
      if (productId) {
        const oldSku = item.sku;
        item.sku = productId;
        
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
}

restoreSkus().catch(console.error);
