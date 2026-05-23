const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'products');
const BUILD_DIR = path.join(__dirname, '..', '..', 'build');
const RULES_FILE = path.join(DATA_DIR, 'gift-rules.json');
const LEGACY_PROMO_FILE = path.join(DATA_DIR, 'promo-gifts.json');
const LEGACY_THRESHOLD_FILE = path.join(DATA_DIR, 'threshold-gifts.json');

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

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return fallback;
  }
}

function readCatalog(filePath) {
  const dataPath = path.join(DATA_DIR, filePath);
  const buildPath = path.join(BUILD_DIR, filePath);
  if (fs.existsSync(dataPath)) return readJson(dataPath, null);
  if (fs.existsSync(buildPath)) return readJson(buildPath, null);
  return null;
}

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readLegacySkus(file) {
  const data = readJson(file, { items: [] });
  return Array.isArray(data.items) ? data.items.map(String).filter(Boolean) : [];
}

function legacyRules() {
  const now = new Date().toISOString();
  const promoRules = readLegacySkus(LEGACY_PROMO_FILE).slice(0, 1).map((sku, index) => ({
    id: `legacy_promo_${index}_${sku}`,
    type: 'promo',
    code: '102030',
    threshold: 2000,
    sku,
    enabled: true,
    legacy: true,
    createdAt: now,
    updatedAt: now,
  }));
  const thresholdRules = readLegacySkus(LEGACY_THRESHOLD_FILE).slice(0, 1).map((sku, index) => ({
    id: `legacy_threshold_${index}_${sku}`,
    type: 'threshold',
    threshold: 2500,
    sku,
    enabled: true,
    legacy: true,
    createdAt: now,
    updatedAt: now,
  }));
  return { promoRules, thresholdRules };
}

function normalizeRule(rule, type) {
  if (!rule || typeof rule !== 'object') return null;
  const normalizedType = type || rule.type;
  const sku = String(rule.sku || '').trim();
  const threshold = Math.max(0, Math.round(Number(rule.threshold) || 0));
  if (!sku || !threshold) return null;
  const base = {
    id: String(rule.id || makeId(normalizedType === 'promo' ? 'promo' : 'threshold')),
    type: normalizedType,
    threshold,
    sku,
    enabled: rule.enabled !== false,
    createdAt: rule.createdAt || new Date().toISOString(),
    updatedAt: rule.updatedAt || rule.createdAt || new Date().toISOString(),
  };
  if (normalizedType === 'promo') {
    const code = normalizeCode(rule.code);
    if (!code) return null;
    base.code = code;
  }
  return base;
}

function readGiftRules() {
  if (!fs.existsSync(RULES_FILE)) return legacyRules();
  const data = readJson(RULES_FILE, {});
  const promoRules = Array.isArray(data.promoRules)
    ? data.promoRules.map(rule => normalizeRule(rule, 'promo')).filter(Boolean)
    : [];
  const thresholdRules = Array.isArray(data.thresholdRules)
    ? data.thresholdRules.map(rule => normalizeRule(rule, 'threshold')).filter(Boolean)
    : [];
  return { promoRules, thresholdRules };
}

function writeGiftRules(rules) {
  ensureDataDir();
  const data = {
    promoRules: Array.isArray(rules.promoRules) ? rules.promoRules : [],
    thresholdRules: Array.isArray(rules.thresholdRules) ? rules.thresholdRules : [],
  };
  fs.writeFileSync(RULES_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function findProductBySku(sku) {
  const skuStr = String(sku);
  for (const catalog of CATALOGS) {
    const data = readCatalog(catalog.file);
    if (!data || !Array.isArray(data.items)) continue;
    const product = data.items.find(item =>
      (item.sku && String(item.sku) === skuStr) ||
      (item.id && String(item.id) === skuStr)
    );
    if (product && product.enabled !== false) {
      return {
        sku: product.sku || product.id || skuStr,
        name: product.name,
        price: product.price,
        catalog: catalog.id,
      };
    }
  }
  return null;
}

function enrichRule(rule) {
  const product = findProductBySku(rule.sku);
  return {
    ...rule,
    product,
  };
}

function getEnrichedGiftRules({ activeOnly = false } = {}) {
  const rules = readGiftRules();
  const filter = rule => {
    const product = findProductBySku(rule.sku);
    return activeOnly ? rule.enabled && !!product : true;
  };
  return {
    promoRules: rules.promoRules.filter(filter).map(enrichRule),
    thresholdRules: rules.thresholdRules.filter(filter).map(enrichRule),
  };
}

module.exports = {
  normalizeCode,
  normalizeRule,
  readGiftRules,
  writeGiftRules,
  findProductBySku,
  getEnrichedGiftRules,
  makeId,
};
