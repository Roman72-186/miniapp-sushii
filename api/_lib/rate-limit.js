// api/_lib/rate-limit.js — простой in-memory rate-limiter.
// Годится только для single-instance деплоя без реплик (см. docker-compose.yml —
// один контейнер app, тот же инвариант, что у isCronRunning в cron-subscriptions.js).

const buckets = new Map();

/**
 * Возвращает true, если запрос уложился в лимит, false — если лимит превышен.
 */
function checkRateLimit(key, { max, windowMs }) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { windowStart: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= max;
}

// Периодическая очистка старых записей, чтобы Map не рос бесконечно.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > 60 * 60 * 1000) buckets.delete(key);
  }
}, 10 * 60 * 1000);
cleanupTimer.unref();

/**
 * IP клиента из заголовка, который выставляет nginx (X-Real-IP: $remote_addr).
 * Доверяем, потому что app недоступен извне напрямую — только через nginx
 * (см. docker-compose.yml: app — expose, не ports).
 */
function getClientIp(req) {
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

module.exports = { checkRateLimit, getClientIp };
