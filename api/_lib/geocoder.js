// api/_lib/geocoder.js — Яндекс Геокодер (требует YANDEX_GEOCODER_API_KEY)

const YANDEX_URL = 'https://geocode-maps.yandex.ru/1.x/';

function bboxForYandex() {
  // .env хранит bbox как "lon1,lat1,lon2,lat2" (единый формат)
  // Yandex ожидает "lon1,lat1~lon2,lat2"
  const raw = process.env.CITY_BBOX;
  if (!raw) return null;
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length !== 4) return null;
  return `${parts[0]},${parts[1]}~${parts[2]},${parts[3]}`;
}

function buildQuery(address) {
  const city = process.env.CITY_NAME || '';
  return city ? `${city}, ${address}` : address;
}

function parseMember(member) {
  if (!member) return null;
  const [lon, lat] = member.GeoObject.Point.pos.split(' ').map(Number);
  const meta = member.GeoObject.metaDataProperty.GeocoderMetaData;
  return {
    lat,
    lon,
    formatted: meta.text,
    precision: meta.precision,
    kind: meta.kind,
  };
}

async function yandexRequest(params) {
  const apiKey = process.env.YANDEX_GEOCODER_API_KEY;
  if (!apiKey) throw new Error('YANDEX_GEOCODER_API_KEY не задан');

  const qs = new URLSearchParams({
    apikey: apiKey,
    format: 'json',
    lang: 'ru_RU',
    ...params,
  });

  const bbox = bboxForYandex();
  if (bbox) {
    qs.append('bbox', bbox);
    qs.append('rspn', '1');
  }

  const res = await fetch(`${YANDEX_URL}?${qs}`);
  if (!res.ok) throw new Error(`Яндекс Геокодер: HTTP ${res.status}`);
  return res.json();
}

/**
 * Геокодирование одного адреса. Возвращает { lat, lon, formatted, precision, kind } или null.
 */
async function geocode(address) {
  const data = await yandexRequest({ geocode: buildQuery(address), results: '1' });
  const member = data?.response?.GeoObjectCollection?.featureMember?.[0];
  return parseMember(member);
}

// Префикс типа улицы, если юзер ввёл только название.
// Yandex плохо понимает голый токен "багратиона", но хорошо — "ул. багратиона".
const STREET_TYPE_RX = /^(ул|улиц|просп|пр-?т|проспект|переул|пер\.|шоссе|бульвар|б-р|набережн|наб\.|пл\.|площад|тупик|аллея|проезд|тракт|микрорайон|мкр)/i;

function prefixWithStreetType(query) {
  const trimmed = query.trim();
  if (STREET_TYPE_RX.test(trimmed)) return trimmed;
  return `ул. ${trimmed}`;
}

/**
 * Подсказки адресов: возвращает до `limit` кандидатов (только улицы/дома, без мусора типа аэропортов).
 */
async function suggest(query, limit = 7) {
  if (!query || query.trim().length < 2) return [];
  const prefixed = prefixWithStreetType(query);
  const data = await yandexRequest({ geocode: buildQuery(prefixed), results: String(limit * 3) });
  const members = data?.response?.GeoObjectCollection?.featureMember || [];
  return members
    .map(parseMember)
    .filter(Boolean)
    .filter(m => m.kind === 'street' || m.kind === 'house')
    .slice(0, limit);
}

module.exports = { geocode, suggest };
