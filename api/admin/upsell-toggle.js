// api/admin/upsell-toggle.js — Admin endpoint для управления списком допродаж

const { checkAuth } = require('../_lib/admin-auth');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'products');
const UPSELL_FILE = path.join(DATA_DIR, 'upsell.json');

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

/**
 * Сохраняет список SKU для допродажи
 */
function saveUpsellSkus(skus) {
  // Создаём папку если нет
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const data = { items: skus };
  fs.writeFileSync(UPSELL_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { sku, action } = req.body || {};

    if (!sku) {
      return res.status(400).json({ error: 'SKU обязателен' });
    }

    if (action !== 'add' && action !== 'remove') {
      return res.status(400).json({ error: 'action должен быть "add" или "remove"' });
    }

    const currentSkus = readUpsellSkus();
    const skuStr = String(sku);

    if (action === 'add') {
      if (currentSkus.includes(skuStr)) {
        return res.status(400).json({ error: 'SKU уже в списке допродаж' });
      }

      if (currentSkus.length >= 6) {
        return res.status(400).json({ error: 'Максимум 6 товаров в допродажах' });
      }

      const newSkus = [...currentSkus, skuStr];
      saveUpsellSkus(newSkus);

      return res.status(200).json({
        success: true,
        sku: skuStr,
        action: 'add',
        totalCount: newSkus.length,
      });
    }

    if (action === 'remove') {
      if (!currentSkus.includes(skuStr)) {
        return res.status(400).json({ error: 'SKU не найден в списке допродаж' });
      }

      const newSkus = currentSkus.filter(s => s !== skuStr);
      saveUpsellSkus(newSkus);

      return res.status(200).json({
        success: true,
        sku: skuStr,
        action: 'remove',
        totalCount: newSkus.length,
      });
    }
  } catch (error) {
    console.error('upsell-toggle error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

module.exports = handler;