// api/upsell-items.js — Публичный GET endpoint для получения товаров допродажи

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'products');
const BUILD_DIR = path.join(__dirname, '..', 'build');
const UPSELL_FILE = path.join(DATA_DIR, 'upsell.json');

// Все каталоги магазина (включая подписочные — чтобы SKU всегда находились)
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

const CATALOG_DISCOUNTS = {
  rolls: 0.30,
  zaproll: 0.30,
  gunkan: 0.30,
  'rolls-sub': 0.30,
  'zaproll-sub': 0.30,
  'sets': 0.20,
  'sets-sub': 0.20,
};

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

function normalizeManualDiscount(discount) {
  const value = Number(discount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value, 100);
}

function formatUpsellProduct(product, catalogId, sku) {
  const basePrice = Number(product.price) || 0;
  const manualDiscount = normalizeManualDiscount(product.discount);
  const effectiveDiscount = manualDiscount > 0
    ? manualDiscount / 100
    : CATALOG_DISCOUNTS[catalogId] || 0;
  const price = effectiveDiscount > 0
    ? Math.round(basePrice * (1 - effectiveDiscount))
    : basePrice;

  return {
    sku: product.sku || product.id || sku,
    name: product.name,
    price,
    oldPrice: effectiveDiscount > 0 ? basePrice : null,
    discount: effectiveDiscount > 0 ? Math.round(effectiveDiscount * 100) : null,
    hasManualDiscount: manualDiscount > 0,
    catalog: catalogId,
  };
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
      const matches = [];

      for (const catalog of CATALOGS) {

        const data = readCatalog(catalog.file);
        if (!data || !data.items) continue;

        const product = data.items.find(item =>
          (item.sku && String(item.sku) === String(sku)) ||
          (item.id && String(item.id) === String(sku))
        );

        if (product && product.enabled !== false) {
          matches.push(formatUpsellProduct(product, catalog.id, sku));
        }
      }

      if (matches.length > 0) {
        const selected =
          matches.find(item => item.hasManualDiscount) ||
          matches.find(item => item.discount) ||
          matches[0];
        const { hasManualDiscount, ...item } = selected;
        items.push(item);
      }
    }

    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error('upsell-items error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

module.exports = handler;
