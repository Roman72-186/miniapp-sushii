// api/admin-stores.js — Управление точками самовывоза (включить/выключить)
const { checkAuth } = require('./_lib/admin-auth');
const fs = require('fs');
const path = require('path');
const { readStates, STATE_FILE } = require('./stores-config');

const STORES_FILE = path.join(__dirname, '..', 'config', 'stores.json');

function readStores() {
  return JSON.parse(fs.readFileSync(STORES_FILE, 'utf-8'));
}

function saveStates(states) {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(states, null, 2), 'utf-8');
}

const handler = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  try {
    if (req.method === 'GET') {
      const stores = readStores();
      const states = readStates();
      const points = states.points || {};
      const labels = {};
      stores.forEach(s => { labels[String(s.id)] = s.name || s.address; });
      return res.status(200).json({ success: true, points, labels });
    }

    if (req.method === 'PUT') {
      const { pointId, enabled } = req.body || {};
      if (!pointId) return res.status(400).json({ error: 'pointId обязателен' });
      if (enabled === undefined) return res.status(400).json({ error: 'enabled обязателен' });

      const states = readStates();
      if (!states.points) states.points = {};
      states.points[String(pointId)] = Boolean(enabled);
      saveStates(states);

      return res.status(200).json({ success: true, pointId: String(pointId), enabled: Boolean(enabled) });
    }

    return res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('admin-stores error:', err.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

module.exports = handler;
