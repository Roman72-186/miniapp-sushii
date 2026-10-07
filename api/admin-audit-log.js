const { checkAuth } = require('./_lib/admin-auth');
const { listAuditLogs } = require('./_lib/db');

function decodeCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(String(value), 'base64url').toString('utf8'));
    if (!parsed.occurredAt || !Number.isFinite(Number(parsed.id))) throw new Error('bad cursor');
    return { occurredAt: String(parsed.occurredAt), id: Number(parsed.id) };
  } catch {
    const error = new Error('Некорректный cursor');
    error.statusCode = 400;
    throw error;
  }
}

function encodeCursor(row) {
  return Buffer.from(JSON.stringify({ occurredAt: row.occurred_at, id: Number(row.id) })).toString('base64url');
}

function normalizeDateFilter(value, endOfDay = false) {
  if (!value) return null;
  const raw = String(value);
  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+05:00`
    : raw;
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) {
    const error = new Error('Некорректный фильтр даты');
    error.statusCode = 400;
    throw error;
  }
  return date.toISOString();
}

function parseStoredJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return { unreadable: true };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Метод не поддерживается' });
  if (!checkAuth(req, res)) return;

  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const defaultFrom = new Date(Date.now() - 7 * 86400000).toISOString();
    const rows = await listAuditLogs({
      from: normalizeDateFilter(req.query.from) || defaultFrom,
      to: normalizeDateFilter(req.query.to, true),
      eventName: req.query.event || null,
      actorType: req.query.actorType || req.query.actor_type || null,
      actorId: req.query.actorId || req.query.actor_id || null,
      targetType: req.query.targetType || req.query.target_type || null,
      targetId: req.query.targetId || req.query.target_id || null,
      result: req.query.result || null,
      requestId: req.query.requestId || req.query.request_id || null,
      cursor: decodeCursor(req.query.cursor),
      limit: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(row => ({
      ...row,
      changes: parseStoredJson(row.changes_json),
      metadata: parseStoredJson(row.metadata_json),
      changes_json: undefined,
      metadata_json: undefined,
    }));
    return res.json({
      success: true,
      items,
      nextCursor: hasMore ? encodeCursor(items[items.length - 1]) : null,
      hasMore,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Ошибка чтения журнала' });
  }
};
