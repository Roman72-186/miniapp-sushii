// api/upsell-items.js — Публичный GET endpoint для получения товаров допродажи

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'products');
const BUILD_DIR = path.join(__dirname, '..', 'build');
const UPSELL_FILE = path.join(DATA_DIR, 'upsell.json');

// Каталоги для поиска товаров (только основные, без подписочных)
const CATALOGS = [
  { id: 'rolls', file: 'холодные роллы/rolls.json' },
  { id: 'zaproll', file: 'запеченные роллы/zaproll.json' },
  { id: 'sets', file: 'сеты/set.json' },
];

/**
 * Читает JSON каталог: сначала из data/products/ (админские правки),
 * потом fallback на build/ (оригинал)
 */
function readCatalog(filePath) {
  const dataPath = path.join(DATA_DIR, filePath);
  const buildPath = path.join(BUILD_DIR, filePath);

  if (fs.existsSync(dataPath)) {
    return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  }
  if (fs.existsSync(buildPath)) {
    return JSON.parse(fs.readFileSync(buildPath, 'utf-8'));
  }
  return null;
}

/**
 * Читает список SKU для допродажи
 */
function readUpsellSkus() {
  if (!fs.existsSync(UPSELL_FILE)) {
    return [];
  }
  try {
    const data = JSON.parse(fs.readFileSync(UPSELL_FILE, 'utf-8'));
    return data.items || [];
  } catch {
    return [];
  }
}

const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const upsellSkus = readUpsellSkus();
    const items = [];

    // Ищем товары по SKU во всех каталогах
    for (const sku of upsellSkus) {
      let found = false;

      for (const catalog of CATALOGS) {
        if (found) break;

        const data = readCatalog(catalog.file);
        if (!data || !data.items) continue;

        const product = data.items.find(item =>
          (item.sku && String(item.sku) === String(sku)) ||
          (item.id && String(item.id) === String(sku))
        );

        if (product && product.enabled !== false) {
          items.push({
            sku: product.sku || product.id || sku,
            name: product.name,
            price: product.price,
            catalog: catalog.id,
          });
          found = true;
        }
      }
    }

    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error('upsell-items error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

module.exports = handler;