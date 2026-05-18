const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'products');
const PUBLIC_DIR = path.join(ROOT, 'public');
const BUILD_DIR = path.join(ROOT, 'build');

const CATALOGS = [
  'холодные роллы/rolls.json',
  'запеченные роллы/zaproll.json',
  'сеты/set.json',
  'гунканы/gunkan.json',
  'добавки/sauces.json',
  'подписка роллы/rolls-sub.json',
  'подписка запеченные/zaproll-sub.json',
  'подписка сеты/sets-sub.json',
  'подписка 490/rolls-490.json',
  'подписка 490/sets-490.json',
];

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/э/g, 'е')
    .replace(/\*/g, '')
    .replace(/^ролл\s+/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isRemoteUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function readCatalog(catalogPath) {
  const paths = [
    path.join(DATA_DIR, catalogPath),
    path.join(PUBLIC_DIR, catalogPath),
    path.join(BUILD_DIR, catalogPath),
  ];

  const source = paths.find(item => fs.existsSync(item));
  if (!source) return null;
  return { source, data: readJson(source) };
}

function writeCatalog(catalogPath, data) {
  const target = path.join(DATA_DIR, catalogPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function loadManifest(filePath) {
  const raw = readJson(filePath);
  const rows = Array.isArray(raw)
    ? raw
    : Object.entries(raw).map(([key, value]) => ({ key, image: value }));

  const bySku = new Map();
  const byName = new Map();

  for (const row of rows) {
    const url = row.image || row.url || row.href;
    if (!isRemoteUrl(url)) {
      throw new Error(`Некорректная ссылка для ${row.sku || row.name || row.key || 'записи'}: ${url}`);
    }

    if (row.sku) bySku.set(String(row.sku), url);
    if (row.name) byName.set(normalizeName(row.name), url);
    if (row.key) {
      const key = String(row.key);
      if (/^\d+$/.test(key)) bySku.set(key, url);
      else byName.set(normalizeName(key), url);
    }
  }

  return { bySku, byName };
}

function findImageUrl(item, manifest) {
  const sku = item.sku || item.id;
  if (sku && manifest.bySku.has(String(sku))) return manifest.bySku.get(String(sku));
  return manifest.byName.get(normalizeName(item.name));
}

function main() {
  const args = process.argv.slice(2);
  const manifestPath = args.find(arg => !arg.startsWith('--'));
  const dryRun = args.includes('--dry-run');

  if (!manifestPath) {
    console.error('Использование: node scripts/apply-product-image-urls.js <manifest.json> [--dry-run]');
    process.exit(1);
  }

  const manifest = loadManifest(path.resolve(manifestPath));
  const report = [];

  for (const catalogPath of CATALOGS) {
    const catalog = readCatalog(catalogPath);
    if (!catalog || !Array.isArray(catalog.data.items)) {
      report.push({ catalog: catalogPath, changed: 0, missing: true });
      continue;
    }

    let changed = 0;
    for (const item of catalog.data.items) {
      const imageUrl = findImageUrl(item, manifest);
      if (!imageUrl || item.image === imageUrl) continue;
      item.image = imageUrl;
      changed += 1;
    }

    if (changed > 0 && !dryRun) writeCatalog(catalogPath, catalog.data);
    report.push({ catalog: catalogPath, changed, source: catalog.source });
  }

  for (const row of report) {
    const suffix = row.missing ? 'нет исходного каталога' : `${row.changed} обновлено`;
    console.log(`${row.catalog}: ${suffix}`);
  }

  if (dryRun) console.log('Dry run: файлы не изменены.');
}

main();
