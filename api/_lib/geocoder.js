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

// Проверка что в запросе уже указан тип (улица/проспект/переулок и т.д.)
const STREET_TYPE_RX = /(ул\.?|улиц|просп|пр-?т|проспект|переул|пер\.|шоссе|бульвар|б-р|набережн|наб\.|площад|тупик|аллея|проезд|тракт|микрорайон|мкр)/i;

async function rawSuggest(query, limit) {
  const data = await yandexRequest({ geocode: buildQuery(query), results: String(limit) });
  const members = data?.response?.GeoObjectCollection?.featureMember || [];
  return members.map(parseMember).filter(Boolean);
}

/**
 * Подсказки адресов: возвращает до `limit` кандидатов (только улицы/дома, без мусора).
 *
 * Делаем два параллельных запроса — с префиксом "ул." и без, — затем объединяем
 * и дедуплицируем. Одиночное слово "багратиона" Yandex без "ул." находит плохо,
 * а двусловные "юрия гагарина" — наоборот плохо находит С "ул." (сбивается порядок).
 */
async function suggest(query, limit = 7) {
  const q = (query || '').trim();
  if (q.length < 2) return [];

  const hasType = STREET_TYPE_RX.test(q);
  const queries = [q];
  if (!hasType) queries.push(`ул. ${q}`);

  const fetchLimit = limit * 3;
  const results = await Promise.all(queries.map(qq => rawSuggest(qq, fetchLimit).catch(() => [])));
  const merged = results.flat();

  // Только улицы и дома
  const filtered = merged.filter(m => m.kind === 'street' || m.kind === 'house');

  // Дедуп по formatted
  const seen = new Set();
  const unique = [];
  for (const item of filtered) {
    if (seen.has(item.formatted)) continue;
    seen.add(item.formatted);
    unique.push(item);
    if (unique.length >= limit) break;
  }
  return unique;
}

module.exports = { geocode, suggest };
