// api/address-suggest.js — Подсказки адресов через Yandex Geocoder
// POST { query: "багратиона" } → { success: true, suggestions: [{ lat, lon, formatted, precision, kind }, ...] }

const { suggest } = require('./_lib/geocoder');

module.exports = async (req, res) => {
  const allowedOrigins = ['https://sushi-house-39.ru', 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const query = String(body.query || '').trim();

    if (query.length < 2) {
      return res.status(200).json({ success: true, suggestions: [] });
    }

    const suggestions = await suggest(query, 7);
    return res.status(200).json({ success: true, suggestions });
  } catch (err) {
    console.error('[address-suggest] error:', err.message);
    return res.status(500).json({ success: false, error: 'Не удалось получить подсказки' });
  }
};
