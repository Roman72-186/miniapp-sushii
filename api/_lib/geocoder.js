// api/_lib/geocoder.js — Яндекс Геокодер

const YANDEX_GEOCODER_URL = 'https://geocode-maps.yandex.ru/1.x/';

async function geocode(address) {
  const apiKey = process.env.YANDEX_GEOCODER_API_KEY;
  if (!apiKey) throw new Error('YANDEX_GEOCODER_API_KEY не задан');

  const city = process.env.CITY_NAME || '';
  const query = city ? `${city}, ${address}` : address;

  const params = new URLSearchParams({
    apikey: apiKey,
    geocode: query,
    format: 'json',
    results: '1',
    lang: 'ru_RU',
  });

  if (process.env.CITY_BBOX) {
    params.append('bbox', process.env.CITY_BBOX);
    params.append('rspn', '1');
  }

  const res = await fetch(`${YANDEX_GEOCODER_URL}?${params}`);
  if (!res.ok) throw new Error(`Яндекс Геокодер: HTTP ${res.status}`);

  const data = await res.json();
  const member = data?.response?.GeoObjectCollection?.featureMember?.[0];
  if (!member) return null;

  const [lon, lat] = member.GeoObject.Point.pos.split(' ').map(Number);
  const formatted = member.GeoObject.metaDataProperty.GeocoderMetaData.text;

  return { lat, lon, formatted };
}

module.exports = { geocode };
