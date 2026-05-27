const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PROJECT_ROOT = path.join(__dirname, '..');
const CACHE_DIR = path.join(PROJECT_ROOT, 'data', 'image-cache');
const SOURCE_ROOTS = [
  path.join(PROJECT_ROOT, 'data', 'product-images'),
  path.join(PROJECT_ROOT, 'data', 'banners'),
  path.join(PROJECT_ROOT, 'build'),
  path.join(PROJECT_ROOT, 'public'),
];
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
const WIDTHS = [96, 160, 240, 320, 480, 640, 960, 1280];
const MAX_AGE = 60 * 60 * 24 * 7;

function tempCachePath(outputPath) {
  const suffix = crypto.randomBytes(6).toString('hex');
  return `${outputPath}.${process.pid}.${Date.now()}.${suffix}.tmp`;
}

function isInside(root, filePath) {
  const rel = path.relative(root, filePath);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function cleanSource(src) {
  if (!src || typeof src !== 'string') return null;
  if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:')) return null;

  const withoutQuery = src.split('?')[0].split('#')[0];
  try {
    return decodeURIComponent(withoutQuery).replace(/\\/g, '/').replace(/^\/+/, '');
  } catch {
    return null;
  }
}

function sourceCandidates(relativeSrc) {
  if (relativeSrc.startsWith('data/product-images/') || relativeSrc.startsWith('data/banners/')) {
    return [path.resolve(PROJECT_ROOT, relativeSrc)];
  }

  return [
    path.resolve(PROJECT_ROOT, 'build', relativeSrc),
    path.resolve(PROJECT_ROOT, 'public', relativeSrc),
  ];
}

function resolveSource(src) {
  const relativeSrc = cleanSource(src);
  if (!relativeSrc || relativeSrc.includes('\0')) return null;

  const ext = path.extname(relativeSrc).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) return null;

  for (const candidate of sourceCandidates(relativeSrc)) {
    if (!SOURCE_ROOTS.some(root => isInside(root, candidate))) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function normalizeWidth(value) {
  const requested = Number(value);
  if (!Number.isFinite(requested) || requested <= 0) return 480;
  const clamped = Math.max(96, Math.min(1280, Math.round(requested)));
  return WIDTHS.find(width => width >= clamped) || WIDTHS[WIDTHS.length - 1];
}

function normalizeQuality(value) {
  const requested = Number(value);
  if (!Number.isFinite(requested)) return 78;
  return Math.max(50, Math.min(90, Math.round(requested)));
}

function pickFormat(req) {
  const requested = String(req.query.format || 'auto').toLowerCase();
  if (requested === 'jpeg' || requested === 'jpg') return { format: 'jpeg', ext: 'jpg', contentType: 'image/jpeg' };
  if (requested === 'png') return { format: 'png', ext: 'png', contentType: 'image/png' };
  if (requested === 'webp' || (requested === 'auto' && /\bimage\/webp\b/.test(req.headers.accept || ''))) {
    return { format: 'webp', ext: 'webp', contentType: 'image/webp' };
  }
  return { format: 'jpeg', ext: 'jpg', contentType: 'image/jpeg' };
}

function cachePath({ sourcePath, width, quality, format, sourceStat }) {
  const key = crypto
    .createHash('sha1')
    .update([sourcePath, sourceStat.mtimeMs, sourceStat.size, width, quality, format].join('|'))
    .digest('hex');
  return path.join(CACHE_DIR, `${key}.${format === 'jpeg' ? 'jpg' : format}`);
}

module.exports = async function imageHandler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sourcePath = resolveSource(req.query.src);
  if (!sourcePath) {
    return res.status(404).json({ error: 'Image not found' });
  }

  const width = normalizeWidth(req.query.w);
  const quality = normalizeQuality(req.query.q);
  const { format, contentType } = pickFormat(req);
  const sourceStat = fs.statSync(sourcePath);
  const outputPath = cachePath({ sourcePath, width, quality, format, sourceStat });

  try {
    await fs.promises.mkdir(CACHE_DIR, { recursive: true });

    if (!fs.existsSync(outputPath)) {
      const tempPath = tempCachePath(outputPath);
      let pipeline = sharp(sourcePath, { animated: false })
        .rotate()
        .resize({ width, withoutEnlargement: true });

      if (format === 'webp') {
        pipeline = pipeline.webp({ quality });
      } else if (format === 'png') {
        pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
      } else {
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      }

      await pipeline.toFile(tempPath);
      await fs.promises.rename(tempPath, outputPath);
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', `public, max-age=${MAX_AGE}`);
    if (String(req.query.format || 'auto').toLowerCase() === 'auto') {
      res.setHeader('Vary', 'Accept');
    }
    return res.sendFile(outputPath);
  } catch (err) {
    console.error('[image] optimize failed:', err.message);
    res.setHeader('Cache-Control', `public, max-age=${MAX_AGE}`);
    return res.sendFile(sourcePath);
  }
};
