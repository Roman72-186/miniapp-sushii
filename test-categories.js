require('dotenv').config();

const FRONTPAD_API = 'https://app.frontpad.ru/api/index.php';
const FRONTPAD_SECRET = process.env.FRONTPAD_SECRET;

async function getProducts() {
  const body = new URLSearchParams({ secret: FRONTPAD_SECRET });

  const response = await fetch(`${FRONTPAD_API}?get_products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  return response.json();
}

async function main() {
  console.log('Запрос к Frontpad API...\n');
  const data = await getProducts();

  // Показать структуру ответа
  console.log('=== КЛЮЧИ ОТВЕТА ===');
  console.log(Object.keys(data));

  // Категории
  if (data.product_cat_id) {
    const uniqueCategories = new Map();
    for (let i = 0; i < data.product_cat_id.length; i++) {
      const catId = data.product_cat_id[i];
      const catName = data.category?.[i] || 'Без категории';
      if (!uniqueCategories.has(catId)) {
        uniqueCategories.set(catId, catName);
      }
    }

    console.log('\n=== КАТЕГОРИИ ===');
    console.log(`Всего уникальных: ${uniqueCategories.size}\n`);
    uniqueCategories.forEach((name, id) => {
      console.log(`  ${id}: "${name}"`);
    });
  }

  // Пример товара
  console.log('\n=== ПРИМЕР ТОВАРА (первый) ===');
  const sample = {};
  Object.keys(data).forEach(key => {
    if (Array.isArray(data[key]) && data[key].length > 0) {
      sample[key] = data[key][0];
    }
  });
  console.log(sample);
}

main().catch(console.error);
