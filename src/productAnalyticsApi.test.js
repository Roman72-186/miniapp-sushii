jest.mock('../api/_lib/db', () => ({
  insertAnalyticsEvent: jest.fn(),
  listAnalyticsEvents: jest.fn(),
  pruneAnalyticsEvents: jest.fn(),
}));

const db = require('../api/_lib/db');
const { normalizeEvent } = require('../api/_lib/product-analytics');
const ingest = require('../api/analytics-events');
const funnelHandler = require('../api/admin-funnel');
const { generateToken } = require('../api/_lib/admin-auth');
const { generateToken: generateUserToken } = require('../api/_lib/auth');

function response() {
  const res = { setHeader: jest.fn(), status: jest.fn(), json: jest.fn(), end: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

const valid = {
  event_id: '123e4567-e89b-42d3-a456-426614174000',
  session_id: '223e4567-e89b-42d3-a456-426614174000',
  event_name: 'order.cart_opened',
  funnel: 'order',
  pathname: '/discount-shop',
  previous_pathname: '/shop',
  metadata: { delivery_type: 'pickup' },
};

beforeEach(() => {
  jest.clearAllMocks();
  db.insertAnalyticsEvent.mockResolvedValue(true);
  db.pruneAnalyticsEvents.mockResolvedValue(0);
  db.listAnalyticsEvents.mockResolvedValue([]);
});

test('normalizer rejects query and PII metadata', () => {
  expect(() => normalizeEvent({ ...valid, pathname: '/shop?phone=1' }, { headers: {} })).toThrow('invalid_path');
  expect(() => normalizeEvent({ ...valid, metadata: { source: 'person@example.com' } }, { headers: {} })).toThrow('pii_metadata');
  expect(() => normalizeEvent({ ...valid, metadata: { phone: '79990000000' } }, { headers: {} })).toThrow('unknown_metadata');
});

test('normalizer rejects a formatted phone in metadata', () => {
  expect(() => normalizeEvent({ ...valid, metadata: { source: '+7 (999) 000-00-00' } }, { headers: {} })).toThrow('pii_metadata');
});

test('ingest ignores client user id and deduplicates through db contract', async () => {
  const res = response();
  await ingest({
    method: 'POST', headers: { origin: 'https://sushi-house-39.ru', 'user-agent': 'Mobile Safari' },
    socket: { remoteAddress: '127.0.0.1' }, body: { events: [{ ...valid, user_id: 'forged' }] },
  }, res);
  expect(db.insertAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ userId: null, clientKind: 'mobile' }));
  expect(res.status).toHaveBeenCalledWith(202);
});

test('ingest anonymizes identity verified from JWT and ignores client identity', async () => {
  const res = response();
  const token = generateUserToken({ telegram_id: 'web_verified_user', email: 'user@example.com' });
  await ingest({
    method: 'POST', headers: { authorization: `Bearer ${token}` }, socket: {},
    body: { events: [{ ...valid, user_id: 'forged_user' }] },
  }, res);
  const stored = db.insertAnalyticsEvent.mock.calls[0][0].userId;
  expect(stored).toMatch(/^[a-f0-9]{64}$/);
  expect(stored).not.toBe('web_verified_user');
});

test('ingest rejects events reserved for server-confirmed outcomes', async () => {
  const res = response();
  await ingest({
    method: 'POST', headers: {}, socket: {},
    body: { events: [{ ...valid, event_name: 'order.created' }] },
  }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(db.insertAnalyticsEvent).not.toHaveBeenCalled();
});

test('ingest rejects an event paired with another funnel', async () => {
  const res = response();
  await ingest({
    method: 'POST', headers: {}, socket: {},
    body: { events: [{ ...valid, funnel: 'subscription' }] },
  }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(db.insertAnalyticsEvent).not.toHaveBeenCalled();
});

test('ingest rejects batches over 20 events', async () => {
  const res = response();
  await ingest({ method: 'POST', headers: {}, socket: {}, body: { events: Array(21).fill(valid) } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(db.insertAnalyticsEvent).not.toHaveBeenCalled();
});

test('admin funnel requires token and returns zero steps without session ids', async () => {
  const unauthorized = response();
  await funnelHandler({ method: 'GET', headers: {}, query: {} }, unauthorized);
  expect(unauthorized.status).toHaveBeenCalledWith(401);

  const res = response();
  await funnelHandler({
    method: 'GET', headers: { authorization: `Bearer ${generateToken()}` }, query: { funnel: 'auth', days: '7' },
  }, res);
  const payload = res.json.mock.calls[0][0];
  expect(payload.steps).toHaveLength(5);
  expect(payload.steps.every(step => step.count === 0)).toBe(true);
  expect(JSON.stringify(payload)).not.toContain('session_id');
});

test('admin funnel does not count a completed session as stopped', async () => {
  db.listAnalyticsEvents.mockResolvedValue([
    { session_id: 'session-1', event_name: 'subscription.landing_view', pathname: '/', occurred_at: new Date().toISOString() },
    { session_id: 'session-1', event_name: 'subscription.payment_succeeded', pathname: '/success', occurred_at: new Date().toISOString() },
  ]);
  const res = response();
  await funnelHandler({
    method: 'GET', headers: { authorization: `Bearer ${generateToken()}` }, query: { funnel: 'subscription', days: '7' },
  }, res);
  expect(res.json.mock.calls[0][0].stoppedSessions).toBe(0);
  expect(res.json.mock.calls[0][0].completedSessions).toBe(1);
  expect(res.json.mock.calls[0][0].steps.every(step => step.count === 1)).toBe(true);
});

test('admin funnel conversion never exceeds 100 percent for direct later-step sessions', async () => {
  const old = new Date(Date.now() - 31 * 60 * 1000).toISOString();
  db.listAnalyticsEvents.mockResolvedValue([
    { session_id: 'session-1', event_name: 'order.catalog_view', pathname: '/shop', occurred_at: old },
    { session_id: 'session-2', event_name: 'order.first_item_added', pathname: '/shop', occurred_at: old },
    { session_id: 'session-3', event_name: 'order.first_item_added', pathname: '/shop', occurred_at: old },
  ]);
  const res = response();
  await funnelHandler({
    method: 'GET', headers: { authorization: `Bearer ${generateToken()}` }, query: { funnel: 'order', days: '7' },
  }, res);
  const maxConversion = Math.max(...res.json.mock.calls[0][0].steps.map(step => step.conversion));
  expect(maxConversion).toBeLessThanOrEqual(100);
});

test('admin funnel counts a server-confirmed result even when browser events were lost', async () => {
  db.listAnalyticsEvents.mockResolvedValue([
    { session_id: 'session-confirmed', event_name: 'order.created', pathname: '/checkout-complete', occurred_at: new Date().toISOString() },
  ]);
  const res = response();
  await funnelHandler({
    method: 'GET', headers: { authorization: `Bearer ${generateToken()}` }, query: { funnel: 'order', days: '7' },
  }, res);
  const payload = res.json.mock.calls[0][0];
  expect(payload.totalSessions).toBe(1);
  expect(payload.completedSessions).toBe(1);
  expect(payload.stoppedSessions).toBe(0);
  expect(payload.steps.every(step => step.count === 1)).toBe(true);
});
