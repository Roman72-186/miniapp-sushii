const { normalizeEvent, authenticatedUser } = require('./_lib/product-analytics');
const { insertAnalyticsEvent, pruneAnalyticsEvents } = require('./_lib/db');

const WINDOW_MS = 60 * 1000;
const MAX_EVENTS_PER_WINDOW = 120;
const MAX_BUCKETS = 10000;
const buckets = new Map();
let lastPruneAt = 0;
let lastBucketCleanupAt = 0;

function rateKey(req) {
  return String(req.ip || req.socket?.remoteAddress || 'unknown');
}

function consumeRateLimit(key, amount) {
  const now = Date.now();
  if (now - lastBucketCleanupAt >= WINDOW_MS || buckets.size > MAX_BUCKETS) {
    lastBucketCleanupAt = now;
    for (const [bucketKey, value] of buckets) {
      if (now - value.startedAt >= WINDOW_MS) buckets.delete(bucketKey);
    }
    while (buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value);
  }
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: amount });
    return amount <= MAX_EVENTS_PER_WINDOW;
  }
  bucket.count += amount;
  return bucket.count <= MAX_EVENTS_PER_WINDOW;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const origin = String(req.headers.origin || '');
  const allowedOrigin = (!origin && process.env.NODE_ENV !== 'production')
    || origin === 'https://sushi-house-39.ru'
    || /^http:\/\/localhost(?::\d+)?$/.test(origin);
  if (!allowedOrigin) return res.status(403).json({ error: 'Недопустимый источник' });

  const contentLength = Number(req.headers['content-length']) || 0;
  if (contentLength > 32768) return res.status(413).json({ error: 'Слишком большой запрос' });
  const events = req.body?.events;
  if (!Array.isArray(events) || events.length < 1 || events.length > 20) {
    return res.status(400).json({ error: 'Ожидается от 1 до 20 событий' });
  }
  if (Buffer.byteLength(JSON.stringify(req.body), 'utf8') > 32768) {
    return res.status(413).json({ error: 'Слишком большой запрос' });
  }
  if (!consumeRateLimit(rateKey(req), events.length)) return res.status(429).json({ error: 'Слишком много событий' });

  try {
    if (Date.now() - lastPruneAt > 86400000) {
      lastPruneAt = Date.now();
      const retentionDays = Math.min(730, Math.max(1, Number(process.env.ANALYTICS_RETENTION_DAYS) || 180));
      await pruneAnalyticsEvents(retentionDays);
    }
    const userId = authenticatedUser(req);
    const normalized = events.map(event => normalizeEvent(event, req, userId));
    let accepted = 0;
    for (const event of normalized) accepted += await insertAnalyticsEvent(event) ? 1 : 0;
    return res.status(202).json({ success: true, accepted });
  } catch (error) {
    const clientErrors = new Set(['invalid_event', 'invalid_uuid', 'unknown_event', 'invalid_path', 'invalid_metadata', 'unknown_metadata', 'pii_metadata']);
    if (clientErrors.has(error.message)) return res.status(400).json({ error: 'Некорректное событие', code: error.message });
    console.error('[analytics] ingest failed:', error.message);
    return res.status(500).json({ error: 'Не удалось сохранить события' });
  }
};
