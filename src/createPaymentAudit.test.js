const mockGetUser = jest.fn();
const mockWriteAuditEvent = jest.fn();

jest.mock('../api/_lib/db', () => ({
  getUser: mockGetUser,
  upsertUser: jest.fn(),
}));
jest.mock('../api/admin-pricing', () => ({
  getPriceTable: () => ({ '290': { 1: 290 } }),
}));
jest.mock('../api/_lib/auth', () => ({
  getAuthenticatedUserId: () => 'web_test',
}));
jest.mock('../api/_lib/audit-log', () => ({
  writeAuditEvent: mockWriteAuditEvent,
  requestContext: () => ({}),
}));

const createPayment = require('../api/create-payment');
const oldShopId = process.env.YOOKASSA_SHOP_ID;
const oldSecretKey = process.env.YOOKASSA_SECRET_KEY;

function response() {
  const res = { setHeader: jest.fn(), status: jest.fn(), json: jest.fn(), end: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.YOOKASSA_SHOP_ID = 'test-shop';
  process.env.YOOKASSA_SECRET_KEY = 'test-key';
  mockGetUser.mockResolvedValue({
    telegram_id: 'web_test',
    phone: '79990000000',
    auto_renew_disabled: true,
  });
  mockWriteAuditEvent.mockResolvedValue(1);
});

afterEach(() => {
  if (oldShopId === undefined) delete process.env.YOOKASSA_SHOP_ID;
  else process.env.YOOKASSA_SHOP_ID = oldShopId;
  if (oldSecretKey === undefined) delete process.env.YOOKASSA_SECRET_KEY;
  else process.env.YOOKASSA_SECRET_KEY = oldSecretKey;
  delete global.fetch;
});

test('при недоступном журнале запрос в ЮKassa не уходит', async () => {
  mockWriteAuditEvent.mockRejectedValueOnce(new Error('audit unavailable'));
  global.fetch = jest.fn();
  const res = response();

  await createPayment({
    method: 'POST',
    body: { telegram_id: 'web_test', tarif: '290', months: 1 },
  }, res);

  expect(global.fetch).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(500);
  expect(mockWriteAuditEvent).toHaveBeenCalledWith(
    expect.objectContaining({ eventName: 'user.payment.create_requested' }),
    { bestEffort: false },
  );
});

test('после создания платежа сохраняет ID ЮKassa без платёжного метода', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      id: 'test-payment-id',
      status: 'pending',
      confirmation: { confirmation_url: 'https://example.test/pay' },
    }),
  });
  const res = response();

  await createPayment({
    method: 'POST',
    body: { telegram_id: 'web_test', tarif: '290', months: 1 },
  }, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(mockWriteAuditEvent).toHaveBeenCalledTimes(2);
  expect(mockWriteAuditEvent.mock.calls[0][0].metadata.saveMethodRequested).toBe(false);
  const created = mockWriteAuditEvent.mock.calls[1][0];
  expect(created.metadata).toEqual(expect.objectContaining({
    providerPaymentId: 'test-payment-id',
    providerStatus: 'pending',
  }));
  expect(JSON.stringify(created)).not.toContain('79990000000');
});
