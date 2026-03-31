// api/_lib/geocoder.js — Nominatim (OpenStreetMap), без ключа

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

async function geocode(address) {
  const city = process.env.CITY_NAME || 'Калининград';
  const query = `${city}, ${address}`;

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
    countrycodes: 'ru',
    'accept-language': 'ru',
  });

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      // Nominatim требует User-Agent с контактом
      'User-Agent': 'SushiHouse39/1.0 (sushi-house-39.ru)',
    },
  });

  if (!res.ok) throw new Error(`Nominatim: HTTP ${res.status}`);

  const data = await res.json();
  if (!data || !data.length) return null;

  const { lat, lon, display_name } = data[0];
  return { lat: Number(lat), lon: Number(lon), formatted: display_name };
}

module.exports = { geocode };
