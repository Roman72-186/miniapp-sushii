// api/_lib/nearest-store.js — Haversine + поиск ближайшего пункта

const path = require('path');
const fs = require('fs');

const storesPath = path.join(__dirname, '..', '..', 'data', 'stores.json');
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(1)} км`;
}

function findNearestStore(lat, lon) {
  let nearest = null;
  let minDist = Infinity;

  for (const store of stores) {
    const dist = haversine(lat, lon, store.lat, store.lon);
    if (dist < minDist) {
      minDist = dist;
      nearest = { ...store, distance: dist, distanceText: formatDistance(dist) };
    }
  }

  return nearest;
}

function findAllSorted(lat, lon) {
  return stores
    .map((s) => {
      const dist = haversine(lat, lon, s.lat, s.lon);
      return { ...s, distance: dist, distanceText: formatDistance(dist) };
    })
    .sort((a, b) => a.distance - b.distance);
}

module.exports = { findNearestStore, findAllSorted };
