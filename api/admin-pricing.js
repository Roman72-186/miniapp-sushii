// api/admin-pricing.js — Управление ценами подписок (GET публичный, PUT с auth)
const { checkAuth } = require('./_lib/admin-auth');
const fs = require('fs');
const path = require('path');

const PRICING_PATH = path.join(__dirname, '..', 'data', 'products', 'pricing.json');

const DEFAULT_PRICING = {
  '290':  { price: 290,  months: { 1: 290,  3: 750,  5: 1200 } },
  '490':  { price: 490,  months: { 1: 490,  3: 1200, 5: 2150 } },
  '1190': { price: 1190, months: { 1: 1190, 3: 3300, 5: 5650 } },
  '9990': { price: 9990, months: { 1: 9990 } },
};

function readPricing() {
  try {
    return JSON.parse(fs.readFileSync(PRICING_PATH, 'utf8'));
  } catch {
    return DEFAULT_PRICING;
  }
}

function writePricing(data) {
  fs.mkdirSync(path.dirname(PRICING_PATH), { recursive: true });
  fs.writeFileSync(PRICING_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Экспорт для использования в create-payment.js
function getPriceTable() {
  const pricing = readPricing();
  const table = {};
  for (const [key, val] of Object.entries(pricing)) {
    table[key] = val.months || { 1: val.price };
  }
  return table;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — публичный (фронт загружает цены)
  if (req.method === 'GET') {
    return res.status(200).json({ success: true, pricing: readPricing() });
  }

  // PUT — обновление цен (auth)
  if (req.method === 'PUT') {
    if (!checkAuth(req, res)) return;
    const { pricing } = req.body || {};
    if (!pricing) return res.status(400).json({ error: 'pricing обязателен' });
    writePricing(pricing);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
};

module.exports.getPriceTable = getPriceTable;
