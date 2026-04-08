// api/_lib/geocoder.js — Nominatim (OpenStreetMap), без ключа

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// Bounding box Калининграда: lon_min, lat_min, lon_max, lat_max
// Покрывает весь город, исключает Балтийск, Черняховск, Зеленоградск и т.д.
const KALININGRAD_VIEWBOX = '20.35,54.65,20.62,54.78';

async function geocode(address) {
  const params = new URLSearchParams({
    q: address,
    format: 'json',
    limit: '1',
    countrycodes: 'ru',
    'accept-language': 'ru',
    viewbox: KALININGRAD_VIEWBOX,
    bounded: '1',
  });

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      'User-Agent': 'SushiHouse39/1.0 (sushi-house-39.ru)',
    },
  });

  if (!res.ok) throw new Error(`Nominatim: HTTP ${res.status}`);

  const data = await res.json();

  // Если с bounded=1 ничего не нашли — пробуем без ограничения с явным "Калининград"
  if (!data || !data.length) {
    const fallbackParams = new URLSearchParams({
      q: address + ', Калининград',
      format: 'json',
      limit: '1',
      countrycodes: 'ru',
      'accept-language': 'ru',
    });
    const res2 = await fetch(`${NOMINATIM_URL}?${fallbackParams}`, {
      headers: { 'User-Agent': 'SushiHouse39/1.0 (sushi-house-39.ru)' },
    });
    if (!res2.ok) return null;
    const data2 = await res2.json();
    if (!data2 || !data2.length) return null;
    const { lat, lon, display_name } = data2[0];
    return { lat: Number(lat), lon: Number(lon), formatted: display_name };
  }

  const { lat, lon, display_name } = data[0];
  return { lat: Number(lat), lon: Number(lon), formatted: display_name };
}

module.exports = { geocode };
