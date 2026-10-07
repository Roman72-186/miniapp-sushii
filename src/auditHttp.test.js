const { EventEmitter } = require('events');

jest.mock('../api/_lib/db', () => ({
  insertAuditLog: jest.fn().mockResolvedValue(1),
}));

const db = require('../api/_lib/db');
const { auditHttp } = require('../api/_lib/audit-log');

beforeEach(() => jest.clearAllMocks());

function makeResponse(statusCode = 200) {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  return res;
}

test('должен записать ровно одно итоговое событие для изменяющего запроса', async () => {
  const req = {
    method: 'POST',
    path: '/api/admin/set-subscription',
    headers: {},
    requestId: 'req-audit-1',
    adminAuth: {
      actorId: 'shared-admin',
      actorLabel: 'Общий администратор',
      sessionId: 'session-1',
    },
    body: {
      telegram_id: 'web_test',
      tariff: '490',
      token: 'must-not-be-logged',
    },
  };
  const res = makeResponse(200);
  const next = jest.fn();

  auditHttp({
    eventName: 'admin.subscription.set',
    actorType: 'staff',
    metadataFields: ['tariff', 'token'],
  })(req, res, next);
  res.emit('finish');
  res.emit('finish');
  await Promise.resolve();

  expect({
    writes: db.insertAuditLog.mock.calls.length,
    event: db.insertAuditLog.mock.calls[0]?.[0],
  }).toMatchObject({
    writes: 1,
    event: {
      eventName: 'admin.subscription.set',
      actorType: 'staff',
      actorId: 'shared-admin',
      actorSessionId: 'session-1',
      targetId: 'web_test',
      result: 'succeeded',
      requestId: 'req-audit-1',
      metadataJson: '{"tariff":"490"}',
    },
  });
});

test('не должен записывать события для GET-запросов', async () => {
  const req = { method: 'GET', path: '/api/admin/audit-log', headers: {}, body: {} };
  const res = makeResponse(200);

  auditHttp({ eventName: 'test.read' })(req, res, jest.fn());
  res.emit('finish');
  await Promise.resolve();

  expect(db.insertAuditLog).not.toHaveBeenCalled();
});

test('не приписывает жертву исполнителю при отказе admin auth', async () => {
  const req = {
    method: 'POST', path: '/api/admin/cancel-subscription', headers: {},
    body: { telegram_id: 'web_victim' },
  };
  const res = makeResponse(401);

  auditHttp({ eventName: 'admin.subscription.auto_renew_disabled', actorType: 'staff' })(req, res, jest.fn());
  res.emit('finish');
  await Promise.resolve();

  expect(db.insertAuditLog).toHaveBeenCalledWith(expect.objectContaining({
    actorType: 'staff', actorId: null, targetId: 'web_victim', result: 'denied',
  }));
});
