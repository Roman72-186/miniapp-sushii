// api/nearest-store.js — Определение ближайшего пункта по адресу или координатам

const { geocode } = require('./_lib/geocoder');
const { findNearestStore, findAllSorted } = require('./_lib/nearest-store');

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
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { address, lat, lon } = body;

    let userLat, userLon, formatted = '';

    if (lat && lon) {
      userLat = Number(lat);
      userLon = Number(lon);
      formatted = 'Геолокация';
    } else if (address) {
      const geo = await geocode(address);
      if (!geo) {
        return res.status(200).json({ success: false, error: 'Адрес не найден' });
      }
      userLat = geo.lat;
      userLon = geo.lon;
      formatted = geo.formatted;
    } else {
      return res.status(400).json({ success: false, error: 'Укажите address или lat+lon' });
    }

    const nearest = findNearestStore(userLat, userLon);
    const all = findAllSorted(userLat, userLon);

    return res.status(200).json({
      success: true,
      formatted,
      nearest,
      all,
    });
  } catch (err) {
    console.error('Nearest store error:', err);
    return res.status(500).json({ success: false, error: 'Ошибка определения ближайшего пункта' });
  }
};
