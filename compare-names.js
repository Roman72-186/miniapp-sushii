// compare-names.js - Детальное сравнение названий
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
      name: parts[1].trim(),
      productId: parts[3] ? parseInt(parts[3], 10) : null
    });
  }
}

// Проблемные SKU
const problemSkus = {
  '411': 'Тилапийский дракон',
  '83': 'Фила Кани гриль', 
  '420': 'Чикен фиера',
  '422': 'Эби свит чили',
  '382': 'сет Джуниор'
};

console.log('=== ПРОБЛЕМНЫЕ ТОВАРЫ ===\n');

Object.entries(problemSkus).forEach(([sku, name]) => {
  const nameLower = name.toLowerCase();
  
  // Ищем похожие названия во Frontpad
  const matches = frontpadItems.filter(fp => {
    const fpLower = fp.name.toLowerCase().replace(/\s*\*\s*$/, '');
    return fpLower.includes(nameLower) || nameLower.includes(fpLower);
  });
  
  console.log(`\n📦 "${name}" (SKU: ${sku})`);
  console.log('   Возможные совпадения во Frontpad:');
  
  if (matches.length === 0) {
    // Ищем по ключевым словам
    const keywords = name.toLowerCase().split(' ').filter(w => w.length > 3);
    const keywordMatches = frontpadItems.filter(fp => {
      const fpLower = fp.name.toLowerCase();
      return keywords.some(kw => fpLower.includes(kw));
    });
    
    if (keywordMatches.length > 0) {
      keywordMatches.slice(0, 5).forEach(m => {
        console.log(`      - ID: ${m.productId} | "${m.name}"`);
      });
    } else {
      console.log('      (нет совпадений)');
    }
  } else {
    matches.forEach(m => {
      console.log(`      - ID: ${m.productId} | "${m.name}"`);
    });
  }
});

// Покажем все ID из CSV для сверки
console.log('\n\n=== ВСЕ PRODUCT_ID ИЗ CSV (для сверки) ===\n');

const byCategory = {};
frontpadItems.forEach(item => {
  // Определяем категорию по названию
  let cat = 'Другое';
  if (item.name.includes('сет')) cat = 'Сеты';
  else if (item.name.includes('ролл') || item.name.includes('маки') || item.name.includes('филадельфия')) cat = 'Роллы';
  else if (item.name.includes('запеченн') || item.name.includes('гриль') || item.name.includes('терияки')) cat = 'Запеченные';
  
  if (!byCategory[cat]) byCategory[cat] = [];
  byCategory[cat].push(item);
});

Object.entries(byCategory).forEach(([cat, items]) => {
  console.log(`\n${cat} (${items.length} товаров):`);
  items.slice(0, 20).forEach(item => {
    console.log(`  ${item.productId}: ${item.name}`);
  });
});
