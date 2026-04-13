// Тест Yandex Geocoder API — проверка ключа и точности
// Запуск на VPS: docker exec miniapp-sushii-app-1 node /app/scripts/test-yandex-geocoder.js

require('dotenv').config();

const API_KEY = process.env.YANDEX_GEOCODER_API_KEY;
const CITY = process.env.CITY_NAME || 'Калининград';
const BBOX = process.env.CITY_BBOX || '19.4,54.3,21.6,55.3';

if (!API_KEY) {
  console.error('Ошибка: YANDEX_GEOCODER_API_KEY не задан');
  process.exit(1);
}

const TESTS = [
  'Багратиона, 100',
  'ул. 4-я Окружная, 10',
  '4-я Большая Окружная, 10',
  'Вагоностроительная, 13',
  'Юрия Гагарина, 16Б',
  'Дзержинского, 174',
];

async function geocode(address) {
  const query = `${CITY}, ${address}`;
  // bbox формат для Яндекс: "lon1,lat1~lon2,lat2"
  const [lon1, lat1, lon2, lat2] = BBOX.split(',');
  const bbox = `${lon1},${lat1}~${lon2},${lat2}`;

  const params = new URLSearchParams({
    apikey: API_KEY,
    geocode: query,
    format: 'json',
    results: '1',
    lang: 'ru_RU',
    bbox,
    rspn: '1',
  });

  const res = await fetch(`https://geocode-maps.yandex.ru/1.x/?${params}`);
  if (!res.ok) {
    return { error: `HTTP ${res.status}: ${await res.text().then(t => t.slice(0, 200))}` };
  }
  const data = await res.json();
  const member = data?.response?.GeoObjectCollection?.featureMember?.[0];
  if (!member) return { error: 'not found' };

  const [lon, lat] = member.GeoObject.Point.pos.split(' ').map(Number);
  const meta = member.GeoObject.metaDataProperty.GeocoderMetaData;
  return {
    lat, lon,
    precision: meta.precision,
    kind: meta.kind,
    text: meta.text,
  };
}

(async () => {
  console.log(`\nYandex Geocoder test — bbox=${BBOX}, city=${CITY}\n`);
  for (const addr of TESTS) {
    const r = await geocode(addr);
    if (r.error) {
      console.log(`❌ ${addr.padEnd(30)} → ${r.error}`);
    } else {
      const mark = r.precision === 'exact' && r.kind === 'house' ? '✅' : '⚠️ ';
      console.log(`${mark} ${addr.padEnd(30)} → ${r.precision}/${r.kind} (${r.lat}, ${r.lon})`);
      console.log(`   → ${r.text}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }
})();
