// api/gift-items.js — Публичный GET: товары-подарки (промо + порог 2500)

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'products');
const BUILD_DIR = path.join(__dirname, '..', 'build');
const PROMO_FILE = path.join(DATA_DIR, 'promo-gifts.json');
const THRESHOLD_FILE = path.join(DATA_DIR, 'threshold-gifts.json');

const CATALOGS = [
  { id: 'rolls', file: 'холодные роллы/rolls.json' },
  { id: 'zaproll', file: 'запеченные роллы/zaproll.json' },
  { id: 'sets', file: 'сеты/set.json' },
  { id: 'gunkan', file: 'гунканы/gunkan.json' },
  { id: 'sauces', file: 'добавки/sauces.json' },
  { id: 'rolls-sub', file: 'подписка роллы/rolls-sub.json' },
  { id: 'zaproll-sub', file: 'подписка запеченные/zaproll-sub.json' },
  { id: 'sets-sub', file: 'подписка сеты/sets-sub.json' },
  { id: 'rolls-490', file: 'подписка 490/rolls-490.json' },
  { id: 'sets-490', file: 'подписка 490/sets-490.json' },
];

function readCatalog(filePath) {
  const dataPath = path.join(DATA_DIR, filePath);
  const buildPath = path.join(BUILD_DIR, filePath);
  if (fs.existsSync(dataPath)) return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  if (fs.existsSync(buildPath)) return JSON.parse(fs.readFileSync(buildPath, 'utf-8'));
  return null;
}

function readSkus(file) {
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')).items || []; }
  catch { return []; }
}

function findProductsBySku(skus) {
  const items = [];
  for (const sku of skus) {
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
  return items;
}

const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Метод не поддерживается' });

  try {
    const promoSkus = readSkus(PROMO_FILE);
    const thresholdSkus = readSkus(THRESHOLD_FILE);

    return res.status(200).json({
      success: true,
      promoGifts: findProductsBySku(promoSkus),
      thresholdGifts: findProductsBySku(thresholdSkus),
      promoSkus,
      thresholdSkus,
    });
  } catch (error) {
    console.error('gift-items error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

module.exports = handler;
