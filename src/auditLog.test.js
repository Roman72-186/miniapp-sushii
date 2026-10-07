jest.mock('../api/_lib/db', () => ({
  insertAuditLog: jest.fn(),
  listAuditLogs: jest.fn(),
}));

const db = require('../api/_lib/db');
const {
  MAX_JSON_BYTES,
  sanitizeObject,
  limitedJson,
  safeDiff,
  hashIp,
  getClientKind,
  writeAuditEvent,
} = require('../api/_lib/audit-log');
const { generateToken } = require('../api/_lib/admin-auth');
const auditHandler = require('../api/admin-audit-log');

beforeEach(() => jest.clearAllMocks());

test('sanitizer удаляет секреты и персональные поля на любой глубине', () => {
  expect(sanitizeObject({
    tariff: '490', token: 'secret', nested: { phone: '79990000000', status: 'ok' }, notes: 'private',
  })).toEqual({ tariff: '490', nested: { status: 'ok' } });
});

test('payload журнала ограничен по размеру', () => {
  const json = limitedJson(Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`field_${i}`, 'x'.repeat(500)])));
  expect(Buffer.byteLength(json, 'utf8')).toBeLessThanOrEqual(MAX_JSON_BYTES);
  expect(JSON.parse(json)).toEqual({ truncated: true });
});

test('safe diff включает только разрешённые изменившиеся поля', () => {
  expect(safeDiff(
    { tariff: '290', phone: 'old', balance: 10 },
    { tariff: '490', phone: 'new', balance: 10 },
    ['tariff', 'phone', 'balance'],
  )).toEqual({ changedFields: ['tariff'], changes: { tariff: { before: '290', after: '490' } } });
});

test('IP хешируется только при настроенном секрете', () => {
  const previous = process.env.AUDIT_IP_HASH_SECRET;
  delete process.env.AUDIT_IP_HASH_SECRET;
  expect(hashIp({ headers: { 'x-forwarded-for': '203.0.113.1' } })).toBeNull();
  process.env.AUDIT_IP_HASH_SECRET = 'test-secret';
  const hashed = hashIp({ headers: { 'x-forwarded-for': '203.0.113.1' } });
  expect(hashed).toMatch(/^[a-f0-9]{64}$/);
  if (previous === undefined) delete process.env.AUDIT_IP_HASH_SECRET;
  else process.env.AUDIT_IP_HASH_SECRET = previous;
});

test('client kind нормализуется без сохранения полного User-Agent', () => {
  expect(getClientKind({ headers: { 'user-agent': 'Mozilla/5.0 (iPhone) Safari/605.1' } })).toBe('mobile');
  expect(getClientKind({ headers: { 'user-agent': 'HealthCheckBot/1.0' } })).toBe('bot');
  expect(getClientKind({ headers: { 'user-agent': 'Mozilla/5.0 Chrome/120' } })).toBe('desktop');
});

test('writer не передаёт в БД секретные metadata', async () => {
  db.insertAuditLog.mockResolvedValue(7);
  await writeAuditEvent({ eventName: 'test.event', result: 'succeeded', metadata: { token: 'x', tariff: '490' } });
  expect(JSON.parse(db.insertAuditLog.mock.calls[0][0].metadataJson)).toEqual({ tariff: '490' });
});

function response() {
  const res = { setHeader: jest.fn(), status: jest.fn(), json: jest.fn(), end: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

test('API журнала требует авторизацию', async () => {
  const res = response();
  await auditHandler({ method: 'GET', headers: {}, query: {} }, res);
  expect(res.status).toHaveBeenCalledWith(401);
});

test('API отклоняет malformed cursor', async () => {
  const res = response();
  await auditHandler({ method: 'GET', headers: { authorization: `Bearer ${generateToken()}` }, query: { cursor: 'bad' } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(db.listAuditLogs).not.toHaveBeenCalled();
});

test('API возвращает безопасный контракт и keyset cursor', async () => {
  db.listAuditLogs.mockResolvedValue([
    { id: 2, occurred_at: '2026-10-06T10:00:00.000Z', event_name: 'admin.subscription.set', changes_json: '{"tariff":{"after":"490"}}', metadata_json: '{}' },
    { id: 1, occurred_at: '2026-10-06T09:00:00.000Z', event_name: 'admin.subscription.set', changes_json: null, metadata_json: null },
  ]);
  const res = response();
  await auditHandler({
    method: 'GET',
    headers: { authorization: `Bearer ${generateToken()}` },
    query: { limit: '1', actorType: 'staff', targetId: 'web_test', requestId: 'req-1' },
  }, res);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, hasMore: true, nextCursor: expect.any(String) }));
  const payload = res.json.mock.calls[0][0];
  expect(payload.items).toHaveLength(1);
  expect(payload.items[0].changes).toEqual({ tariff: { after: '490' } });
  expect(payload.items[0].changes_json).toBeUndefined();
  expect(db.listAuditLogs).toHaveBeenCalledWith(expect.objectContaining({
    actorType: 'staff', targetId: 'web_test', requestId: 'req-1', limit: 2,
  }));
});

test('API не падает на повреждённом JSON одной записи', async () => {
  db.listAuditLogs.mockResolvedValue([
    { id: 1, occurred_at: '2026-10-06T09:00:00.000Z', event_name: 'test.event', changes_json: '{bad', metadata_json: null },
  ]);
  const res = response();
  await auditHandler({ method: 'GET', headers: { authorization: `Bearer ${generateToken()}` }, query: {} }, res);
  const payload = res.json.mock.calls[0][0];
  expect(payload.items[0].changes).toEqual({ unreadable: true });
});
