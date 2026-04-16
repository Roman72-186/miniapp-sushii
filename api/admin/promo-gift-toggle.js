// api/admin/promo-gift-toggle.js — Toggle SKU подарков по промокоду

const { checkAuth } = require('../_lib/admin-auth');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'products');
const FILE = path.join(DATA_DIR, 'promo-gifts.json');

function readSkus() {
  if (!fs.existsSync(FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf-8')).items || [];
  } catch { return []; }
}

function saveSkus(skus) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify({ items: skus }, null, 2), 'utf-8');
}

const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  try {
    const { sku, action } = req.body || {};
    if (!sku) return res.status(400).json({ error: 'SKU обязателен' });
    if (action !== 'add' && action !== 'remove') return res.status(400).json({ error: 'action: "add" или "remove"' });

    const current = readSkus();
    const skuStr = String(sku);

    if (action === 'add') {
      if (current.includes(skuStr)) return res.status(400).json({ error: 'SKU уже в списке' });
      if (current.length >= 10) return res.status(400).json({ error: 'Максимум 10 товаров' });
      const next = [...current, skuStr];
      saveSkus(next);
      return res.status(200).json({ success: true, sku: skuStr, action: 'add', totalCount: next.length });
    }

    if (action === 'remove') {
      if (!current.includes(skuStr)) return res.status(400).json({ error: 'SKU не найден в списке' });
      const next = current.filter(s => s !== skuStr);
      saveSkus(next);
      return res.status(200).json({ success: true, sku: skuStr, action: 'remove', totalCount: next.length });
    }
  } catch (error) {
    console.error('promo-gift-toggle error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

module.exports = handler;
