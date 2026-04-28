// api/stores-config.js — Публичный конфиг точек самовывоза (без авторизации)
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'data', 'store-states.json');

function readStates() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch (_) {}
  return { points: { '1': true, '2': true, '3': true, '4': true } };
}

const handler = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Метод не поддерживается' });

  const states = readStates();
  return res.status(200).json({ points: states.points || {} });
};

module.exports = handler;
module.exports.readStates = readStates;
module.exports.STATE_FILE = STATE_FILE;
