// check-problematic-skus.js - Проверка проблемных SKU через API
const { getProducts } = require('./api/_lib/frontpad');

async function check() {
  const result = await getProducts();
  
  if (!result.success) {
    console.error('Ошибка:', result.error);
    return;
  }
  
  const products = result.data;
  
  // Проблемные SKU из JSON
  const problemSkus = ['411', '83', '420', '422', '382'];
  
  console.log('=== ПРОВЕРКА ПРОБЛЕМНЫХ SKU ЧЕРЕЗ FRONTPAD API ===\n');
  
  problemSkus.forEach(sku => {
    const found = products.find(p => String(p.id) === sku);
    console.log(`SKU ${sku}: ${found ? `✅ НАЙДЕН - "${found.name}" (${found.price}₽)` : '❌ НЕ НАЙДЕН'}`);
  });
  
  // Ищем товары с похожими названиями
  console.log('\n=== ПОИСК ПОХОЖИХ НАЗВАНИЙ ВО FRONTPAD ===\n');
  
  const searchTerms = ['Тилап', 'Фила Кан', 'Чикен фиер', 'Эби свит', 'Джуниор'];
  
  searchTerms.forEach(term => {
    const matches = products.filter(p => p.name.toLowerCase().includes(term.toLowerCase()));
    console.log(`\n🔍 "${term}":`);
    if (matches.length === 0) {
      console.log('   (нет совпадений)');
    } else {
      matches.forEach(m => {
        console.log(`   ID: ${m.id} — "${m.name}" (${m.price}₽) ${m.hasSale ? '[СКИДКА]' : ''}`);
      });
    }
  });
  
  // Покажем все ID из Frontpad для сравнения с JSON
  console.log('\n=== ВСЕ ТОВАРЫ ВО FRONTPAD (ID + название) ===\n');
  
  // Сортируем по ID
  products.sort((a, b) => parseInt(a.id) - parseInt(b.id));
  
  products.forEach(p => {
    console.log(`  ${String(p.id).padStart(4, ' ')}: ${p.name} (${p.price}₽)`);
  });
}

check().catch(console.error);
