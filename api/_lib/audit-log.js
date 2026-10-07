const crypto = require('crypto');

const MAX_JSON_BYTES = 8192;
const VALID_ACTORS = new Set(['user', 'staff', 'system', 'webhook']);
const VALID_RESULTS = new Set(['attempted', 'succeeded', 'failed', 'denied']);
const BLOCKED_KEY = /(password|token|secret|authorization|cookie|otp|payment_method|email|phone|address|name|notes)/i;

function cleanString(value, max = 200) {
  if (value === null || value === undefined || value === '') return null;
  return String(value).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
}

function sanitizeObject(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return null;
  if (['string', 'number', 'boolean'].includes(typeof value)) {
    return typeof value === 'string' ? value.slice(0, 500) : value;
  }
  if (Array.isArray(value)) return value.slice(0, 50).map(v => sanitizeObject(v, depth + 1));
  if (typeof value !== 'object') return null;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (BLOCKED_KEY.test(key)) continue;
    result[key] = sanitizeObject(item, depth + 1);
  }
  return result;
}

function limitedJson(value) {
  if (value === null || value === undefined) return null;
  const sanitized = sanitizeObject(value);
  let json = JSON.stringify(sanitized);
  if (Buffer.byteLength(json, 'utf8') <= MAX_JSON_BYTES) return json;
  json = JSON.stringify({ truncated: true });
  return json;
}

function safeDiff(before = {}, after = {}, allowedFields = []) {
  const changedFields = [];
  const changes = {};
  for (const field of allowedFields) {
    if (BLOCKED_KEY.test(field) || before[field] === after[field]) continue;
    changedFields.push(field);
    changes[field] = { before: sanitizeObject(before[field]), after: sanitizeObject(after[field]) };
  }
  return { changedFields, changes };
}

function getClientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  return cleanString(Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '').split(',')[0].trim() || req?.socket?.remoteAddress, 100);
}

function hashIp(req) {
  const secret = process.env.AUDIT_IP_HASH_SECRET;
  const ip = getClientIp(req);
  if (!secret || !ip) return null;
  return crypto.createHmac('sha256', secret).update(ip).digest('hex');
}

function getClientKind(req) {
  const userAgent = String(req?.headers?.['user-agent'] || '');
  if (!userAgent) return null;
  if (/bot|crawler|spider|monitor|healthcheck/i.test(userAgent)) return 'bot';
  if (/mobile|android|iphone|ipad/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

function requestContext(req) {
  return {
    requestId: cleanString(req?.requestId, 100),
    correlationId: cleanString(req?.correlationId, 100),
    // Только path: query string может содержать телефон, email или адрес.
    source: cleanString(req?.path || String(req?.url || '').split('?')[0], 250),
    httpMethod: cleanString(req?.method, 10),
    ipHash: hashIp(req),
    // Полный User-Agent не сохраняем: он избыточен и может содержать уникальные данные.
    clientKind: getClientKind(req),
  };
}

async function writeAuditEvent(event, { bestEffort = true } = {}) {
  const { insertAuditLog } = require('./db');
  const entry = {
    occurredAt: new Date().toISOString(),
    eventName: cleanString(event.eventName, 120),
    eventVersion: Number(event.eventVersion) || 1,
    actorType: VALID_ACTORS.has(event.actorType) ? event.actorType : 'system',
    actorId: cleanString(event.actorId, 150),
    actorLabel: cleanString(event.actorLabel, 150),
    actorSessionId: cleanString(event.actorSessionId, 150),
    targetType: cleanString(event.targetType, 80),
    targetId: cleanString(event.targetId, 150),
    result: VALID_RESULTS.has(event.result) ? event.result : 'failed',
    requestId: cleanString(event.requestId, 100),
    correlationId: cleanString(event.correlationId, 150),
    source: cleanString(event.source, 250),
    httpMethod: cleanString(event.httpMethod, 10),
    statusCode: Number.isInteger(event.statusCode) ? event.statusCode : null,
    ipHash: cleanString(event.ipHash, 64),
    clientKind: cleanString(event.clientKind, 120),
    changesJson: limitedJson(event.changes),
    metadataJson: limitedJson(event.metadata),
    errorCode: cleanString(event.errorCode, 100),
  };
  if (!entry.eventName) throw new Error('eventName is required');
  try {
    return await insertAuditLog(entry);
  } catch (error) {
    if (!bestEffort) throw error;
    console.error('[audit] write failed:', error.message);
    return null;
  }
}

function buildRequestAuditEvent(req, res, definition) {
  const statusCode = res.statusCode || 500;
  const auth = req.adminAuth || {};
  const userId = req.auditActorId || req.userId || req.body?.telegram_id || null;
  const targetId = typeof definition.targetId === 'function'
    ? definition.targetId(req)
    : (definition.targetId || req.auditTargetId || req.body?.telegram_id || req.body?.user_id || userId);
  const eventName = typeof definition.eventName === 'function'
    ? definition.eventName(statusCode, req)
    : definition.eventName;
  const metadata = {};
  for (const key of definition.metadataFields || []) {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, key) && !BLOCKED_KEY.test(key)) {
      metadata[key] = req.body[key];
    }
  }
  Object.assign(metadata, sanitizeObject(req.auditMetadata || {}));
  const changedFields = (definition.changeFields || [])
    .filter(key => req.body && Object.prototype.hasOwnProperty.call(req.body, key));
  return {
    ...requestContext(req),
    eventName,
    actorType: definition.actorType || (auth.sessionId ? 'staff' : 'user'),
    // Не приписываем ID целевого пользователя неавторизованному сотруднику.
    actorId: auth.actorId || (definition.actorType === 'staff'
      ? null
      : (definition.actorType === 'webhook' ? 'yookassa' : userId)),
    actorLabel: auth.actorLabel || null,
    actorSessionId: auth.sessionId || null,
    targetType: definition.targetType || 'user',
    targetId,
    result: statusCode >= 200 && statusCode < 400 ? 'succeeded' : (statusCode === 401 || statusCode === 403 ? 'denied' : 'failed'),
    statusCode,
    metadata,
    changes: changedFields.length ? { changedFields } : null,
    errorCode: statusCode >= 400 ? `http_${statusCode}` : null,
  };
}

function auditHttp(definition) {
  return (req, res, next) => {
    res.once('finish', () => {
      if (req.method === 'OPTIONS' || req.method === 'GET') return;
      if (req.auditSkip || (definition.shouldAudit && !definition.shouldAudit(req, res))) return;
      const event = buildRequestAuditEvent(req, res, definition);
      if (event.eventName) void writeAuditEvent(event);
    });
    next();
  };
}

module.exports = {
  MAX_JSON_BYTES,
  sanitizeObject,
  limitedJson,
  safeDiff,
  hashIp,
  getClientKind,
  requestContext,
  writeAuditEvent,
  buildRequestAuditEvent,
  auditHttp,
};
