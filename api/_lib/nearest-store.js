// api/_lib/nearest-store.js — Haversine + поиск ближайшего пункта

const path = require('path');
const fs = require('fs');

const storesPath = path.join(__dirname, '..', '..', 'config', 'stores.json');
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));
const { readStates } = require('../stores-config');
const overridesPath = path.join(__dirname, '..', '..', 'config', 'delivery-zone-overrides.json');
const deliveryZoneOverrides = fs.existsSync(overridesPath)
  ? JSON.parse(fs.readFileSync(overridesPath, 'utf8'))
  : [];

function getActiveStores(states = readStates()) {
  const points = states?.points || {};
  return stores.filter(store => points[String(store.id)] !== false);
}

function findActiveStoreById(storeId, states = readStates()) {
  return getActiveStores(states).find(store => String(store.id) === String(storeId)) || null;
}

function normalizeStreet(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\bул\.?\s*/g, '')
    .replace(/\bулица\b/g, '')
    .replace(/[^а-яa-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

function findNearestStore(lat, lon, states = readStates()) {
  let nearest = null;
  let minDist = Infinity;

  for (const store of getActiveStores(states)) {
    const dist = haversine(lat, lon, store.lat, store.lon);
    if (dist < minDist) {
      minDist = dist;
      nearest = { ...store, distance: dist, distanceText: formatDistance(dist) };
    }
  }

  return nearest;
}

function findStoreForDelivery(address, lat, lon, states = readStates()) {
  const normalizedAddress = normalizeStreet(address);
  const activeStores = getActiveStores(states);
  const override = deliveryZoneOverrides.find(rule => {
    const street = normalizeStreet(rule.street);
    return street && normalizedAddress.includes(street);
  });

  if (override) {
    const store = activeStores.find(item => String(item.id) === String(override.storeId));
    if (store) {
      const distance = haversine(lat, lon, store.lat, store.lon);
      return { ...store, distance, distanceText: formatDistance(distance), zoneOverride: true };
    }
  }

  return findNearestStore(lat, lon, states);
}

function findAllSorted(lat, lon, states = readStates()) {
  return getActiveStores(states)
    .map((s) => {
      const dist = haversine(lat, lon, s.lat, s.lon);
      return { ...s, distance: dist, distanceText: formatDistance(dist) };
    })
    .sort((a, b) => a.distance - b.distance);
}

module.exports = {
  findNearestStore,
  findStoreForDelivery,
  findAllSorted,
  findActiveStoreById,
  getActiveStores,
};
