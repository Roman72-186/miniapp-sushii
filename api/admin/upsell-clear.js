// api/admin/upsell-clear.js — Очистка всего списка допродаж

const { checkAuth } = require('../_lib/admin-auth');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'products');
const UPSELL_FILE = path.join(DATA_DIR, 'upsell.json');

const handler = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(UPSELL_FILE, JSON.stringify({ items: [] }, null, 2), 'utf-8');
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('upsell-clear error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

module.exports = handler;
