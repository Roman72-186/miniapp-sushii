const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const BUILD_DIR = path.join(ROOT, 'build');
const DATA_PRODUCTS_DIR = path.join(ROOT, 'data', 'products');
const DATA_IMAGES_DIR = path.join(ROOT, 'data', 'product-images');
const IMAGE_MAP_PATH = path.join(ROOT, 'src', 'config', 'imageMap.js');

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

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico']);

function requiredEnv(name, fallbackName) {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : '');
  if (!value) throw new Error(`Не задана переменная окружения ${name}${fallbackName ? ` или ${fallbackName}` : ''}`);
  return value;
}

function optionalEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/э/g, 'е')
    .replace(/\*/g, '')
    .replace(/-/g, ' ')
    .replace(/^ролл\s+/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function readCatalog(catalogPath) {
  const candidates = [
    path.join(DATA_PRODUCTS_DIR, catalogPath),
    path.join(PUBLIC_DIR, catalogPath),
    path.join(BUILD_DIR, catalogPath),
  ];
  const source = candidates.find(filePath => fs.existsSync(filePath));
  if (!source) return null;
  return { source, data: readJson(source) };
}

function writeCatalog(catalogPath, data) {
  const target = path.join(DATA_PRODUCTS_DIR, catalogPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function decodeJsString(value) {
  return value
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function loadImageMap() {
  const content = fs.readFileSync(IMAGE_MAP_PATH, 'utf8');
  const match = content.match(/const IMAGE_MAP\s*=\s*\{([\s\S]+?)\n\};/);
  if (!match) throw new Error('Не удалось найти IMAGE_MAP в src/config/imageMap.js');

  const result = new Map();
  const entryRe = /(['"])((?:\\.|(?!\1).)*)\1\s*:\s*(['"])((?:\\.|(?!\3).)*)\3/g;
  let entry;
  while ((entry = entryRe.exec(match[1]))) {
    result.set(normalizeName(decodeJsString(entry[2])), decodeJsString(entry[4]));
  }
  return result;
}

function isRemoteUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function normalizeLocalImagePath(value) {
  const raw = String(value || '').trim();
  if (!raw || isRemoteUrl(raw)) return null;
  return raw.replace(/^\/public\//, '/').replace(/^public\//, '/').replace(/\\/g, '/');
}

function findMappedImagePath(imageMap, name) {
  const normalized = normalizeName(name);
  if (imageMap.has(normalized)) return imageMap.get(normalized);

  for (const [key, value] of imageMap.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) return value;
  }

  return null;
}

function localImageFile(publicPath) {
  if (!publicPath) return null;
  const clean = publicPath.replace(/^\//, '');
  const candidates = [
    path.join(PUBLIC_DIR, clean),
    path.join(BUILD_DIR, clean),
  ];
  if (clean.startsWith('data/product-images/')) {
    candidates.unshift(path.join(ROOT, clean));
  }
  return candidates.find(filePath => fs.existsSync(filePath)) || null;
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.ico') return 'image/x-icon';
  return 'application/octet-stream';
}

function sha256(value, encoding = 'hex') {
  return crypto.createHash('sha256').update(value).digest(encoding);
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding);
}

function signingKey(secret, dateStamp, region, service) {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

function awsEncode(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, char =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function encodeKeyPart(value) {
  return String(value).split('/').map(awsEncode).join('/');
}

function publicUrlForKey(publicBaseUrl, key) {
  return `${publicBaseUrl.replace(/\/+$/, '')}/${encodeKeyPart(key)}`;
}

function objectKeyForImage(prefix, publicPath) {
  return `${prefix.replace(/^\/+|\/+$/g, '')}/${publicPath.replace(/^\/+/, '')}`.replace(/\\/g, '/');
}

async function uploadObject({ endpoint, region, bucket, accessKey, secretKey, key, body, type, cacheControl, acl }) {
  const endpointUrl = new URL(endpoint);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body);
  const canonicalUri = `${endpointUrl.pathname.replace(/\/+$/, '')}/${bucket}/${encodeKeyPart(key)}`.replace(/\/{2,}/g, '/');
  const targetUrl = new URL(canonicalUri, endpointUrl.origin);

  const headers = {
    'cache-control': cacheControl,
    'content-length': String(body.length),
    'content-type': type,
    host: endpointUrl.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (acl) headers['x-amz-acl'] = acl;

  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames.map(name => `${name}:${headers[name]}\n`).join('');
  const signedHeaders = signedHeaderNames.join(';');
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');
  const signature = hmac(signingKey(secretKey, dateStamp, region, 's3'), stringToSign, 'hex');

  const response = await fetch(targetUrl, {
    method: 'PUT',
    headers: {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`S3 PUT ${response.status} ${response.statusText}: ${text.slice(0, 500)}`);
  }
}

function collectCatalogImageRefs(imageMap) {
  const refs = [];
  const missing = [];

  for (const catalogPath of CATALOGS) {
    const catalog = readCatalog(catalogPath);
    if (!catalog || !Array.isArray(catalog.data.items)) continue;

    for (const item of catalog.data.items) {
      if (item.enabled === false) continue;
      const existingImage = item.image;
      const imagePath = normalizeLocalImagePath(existingImage) || findMappedImagePath(imageMap, item.name);

      if (isRemoteUrl(existingImage)) {
        refs.push({ catalogPath, catalogData: catalog.data, item, remoteUrl: existingImage });
        continue;
      }

      const filePath = localImageFile(imagePath);
      if (!filePath || !IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
        missing.push({ catalogPath, sku: item.sku || item.id || '', name: item.name, imagePath: imagePath || '' });
        continue;
      }

      refs.push({
        catalogPath,
        catalogData: catalog.data,
        item,
        publicPath: imagePath,
        filePath,
      });
    }
  }

  return { refs, missing };
}

function uniqueUploads(refs, prefix) {
  const uploads = new Map();
  for (const ref of refs) {
    if (!ref.filePath || !ref.publicPath) continue;
    const key = objectKeyForImage(prefix, ref.publicPath);
    if (!uploads.has(key)) uploads.set(key, { key, filePath: ref.filePath, publicPath: ref.publicPath });
  }
  return [...uploads.values()];
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const skipUpload = args.includes('--skip-upload');
  const cacheControl = optionalEnv('S3_CACHE_CONTROL', 'public, max-age=31536000, immutable');
  const prefix = optionalEnv('S3_PREFIX', 'products');

  const imageMap = loadImageMap();
  const { refs, missing } = collectCatalogImageRefs(imageMap);
  const uploads = uniqueUploads(refs, prefix);

  console.log(`Найдено ссылок в каталогах: ${refs.length}`);
  console.log(`Уникальных локальных файлов к загрузке: ${uploads.length}`);
  console.log(`Без локальной картинки: ${missing.length}`);

  let s3Config = null;
  if (write && !skipUpload) {
    s3Config = {
      endpoint: requiredEnv('S3_ENDPOINT'),
      region: requiredEnv('S3_REGION', 'AWS_REGION'),
      bucket: requiredEnv('S3_BUCKET'),
      accessKey: requiredEnv('S3_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID'),
      secretKey: requiredEnv('S3_SECRET_ACCESS_KEY', 'AWS_SECRET_ACCESS_KEY'),
      publicBaseUrl: requiredEnv('S3_PUBLIC_BASE_URL', 'CDN_BASE_URL'),
      acl: optionalEnv('S3_ACL', ''),
    };
  } else {
    const publicBaseUrl = optionalEnv('S3_PUBLIC_BASE_URL', optionalEnv('CDN_BASE_URL', 'https://example-cdn.invalid'));
    s3Config = { publicBaseUrl };
  }

  const uploadedUrls = new Map();
  for (const upload of uploads) {
    const url = publicUrlForKey(s3Config.publicBaseUrl, upload.key);
    uploadedUrls.set(upload.publicPath, url);

    if (write && !skipUpload) {
      const body = fs.readFileSync(upload.filePath);
      await uploadObject({
        ...s3Config,
        key: upload.key,
        body,
        type: contentType(upload.filePath),
        cacheControl,
      });
      console.log(`uploaded ${upload.key}`);
    }
  }

  const changedCatalogs = new Map();
  for (const ref of refs) {
    if (ref.remoteUrl) continue;
    const remoteUrl = uploadedUrls.get(ref.publicPath);
    if (!remoteUrl || ref.item.image === remoteUrl) continue;
    ref.item.image = remoteUrl;
    changedCatalogs.set(ref.catalogPath, ref.catalogData);
  }

  if (write) {
    for (const [catalogPath, catalogData] of changedCatalogs.entries()) {
      writeCatalog(catalogPath, catalogData);
    }

    const manifestPath = path.join(DATA_PRODUCTS_DIR, 's3-image-manifest.json');
    const manifest = new Map();
    if (fs.existsSync(manifestPath)) {
      for (const row of readJson(manifestPath)) {
        if (row.localPath && row.url) manifest.set(row.localPath, row.url);
      }
    }
    for (const [localPath, url] of uploadedUrls.entries()) manifest.set(localPath, url);

    fs.mkdirSync(DATA_PRODUCTS_DIR, { recursive: true });
    fs.writeFileSync(manifestPath, `${JSON.stringify([...manifest.entries()].map(([localPath, url]) => ({ localPath, url })), null, 2)}\n`, 'utf8');
  }

  for (const catalogPath of CATALOGS) {
    const count = refs.filter(ref => ref.catalogPath === catalogPath && !ref.remoteUrl && uploadedUrls.has(ref.publicPath)).length;
    console.log(`${catalogPath}: ${count} image URL candidates`);
  }

  if (missing.length) {
    console.log('\nПервые товары без локальной картинки:');
    for (const row of missing.slice(0, 20)) {
      console.log(`${row.catalogPath}: ${row.sku || '-'} ${row.name} (${row.imagePath || 'нет imageMap'})`);
    }
  }

  if (!write) {
    console.log('\nDry run: загрузка в S3 и запись каталогов не выполнялись. Добавьте --write для миграции.');
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
