// scripts/check-frontpad-skus.js — Сверка SKU из JSON с реальными ID в Frontpad
require('dotenv').config();
const { getProducts } = require('../api/_lib/frontpad');
const rolls = require('../public/подписка 490/rolls-490.json');
const sets = require('../public/подписка 490/sets-490.json');

async function main() {
  console.log('Загружаем товары из Frontpad...');
  const result = await getProducts();
  if (!result.success) {
    console.error('Ошибка Frontpad:', result.error);
    process.exit(1);
  }

  const products = result.data;
  console.log(`Получено товаров из Frontpad: ${products.length}`);

  const byId = {};
  const byName = {};
  for (const p of products) {
    byId[String(p.id)] = p;
    byName[p.name.toLowerCase().trim()] = p;
  }

  let errors = 0;

  console.log('\n=== РОЛЛЫ (rolls-490.json) ===');
  for (const item of rolls.items) {
    const inFp = byId[String(item.sku)];
    const byNameMatch = byName[item.name.toLowerCase().trim()];
    if (!inFp) {
      const suggestion = byNameMatch ? `→ правильный ID: ${byNameMatch.id} ("${byNameMatch.name}")` : '→ не найден по имени';
      console.log(`❌ SKU ${item.sku} НЕ НАЙДЕН — "${item.name}" ${suggestion}`);
      errors++;
    } else if (inFp.name.toLowerCase().trim() !== item.name.toLowerCase().trim()) {
      console.log(`⚠️  SKU ${item.sku} — наш: "${item.name}" | Frontpad: "${inFp.name}"`);
      errors++;
    } else {
      console.log(`✅ ${item.sku} — "${item.name}"`);
    }
  }

  console.log('\n=== СЕТЫ (sets-490.json) ===');
  for (const item of sets.items) {
    const inFp = byId[String(item.sku)];
    const byNameMatch = byName[item.name.toLowerCase().trim()];
    if (!inFp) {
      const suggestion = byNameMatch ? `→ правильный ID: ${byNameMatch.id} ("${byNameMatch.name}")` : '→ не найден по имени';
      console.log(`❌ SKU ${item.sku} НЕ НАЙДЕН — "${item.name}" ${suggestion}`);
      errors++;
    } else if (inFp.name.toLowerCase().trim() !== item.name.toLowerCase().trim()) {
      console.log(`⚠️  SKU ${item.sku} — наш: "${item.name}" | Frontpad: "${inFp.name}"`);
      errors++;
    } else {
      console.log(`✅ ${item.sku} — "${item.name}"`);
    }
  }

  console.log(`\nИтог: ${errors} проблем найдено.`);
}

main().catch(console.error);
