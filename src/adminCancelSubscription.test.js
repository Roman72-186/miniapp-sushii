const fs = require('fs');
const path = require('path');
jest.mock('../api/_lib/db', () => ({ getUser: jest.fn(), cancelAutoRenew: jest.fn() }));
const db = require('../api/_lib/db');
const { generateToken } = require('../api/_lib/admin-auth');
const handler = require('../api/admin-cancel-subscription');

let user;
let removeCache;
beforeEach(() => {
  jest.clearAllMocks();
  user = {
    telegram_id: 'web_test_123', subscription_status: 'активно',
    subscription_start: '01.09.2026', subscription_end: '01.10.2026',
    tariff: '490', balance_shc: 100, payment_method_id: 'test-method', auto_renew_disabled: false,
  };
  db.getUser.mockImplementation(async () => user);
  db.cancelAutoRenew.mockImplementation(async () => {
    user.payment_method_id = null;
    user.auto_renew_disabled = true;
  });
  removeCache = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

async function request({ method = 'POST', token = generateToken(), id = 'web_test_123' } = {}) {
  const res = { setHeader: jest.fn(), status: jest.fn(), json: jest.fn(), end: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  await handler({ method, headers: { authorization: `Bearer ${token}` }, body: { telegram_id: id } }, res);
  return res;
}

test('без токена администратора отмена запрещена', async () => {
  const res = await request({ token: 'invalid' });
  expect(res.status).toHaveBeenCalledWith(401);
  expect(db.getUser).not.toHaveBeenCalled();
  expect(db.cancelAutoRenew).not.toHaveBeenCalled();
});

test.each(['GET', 'DELETE'])('метод %s не изменяет подписку', async method => {
  expect((await request({ method })).status).toHaveBeenCalledWith(405);
  expect(db.cancelAutoRenew).not.toHaveBeenCalled();
});

test.each(['../outside', '', {}, null])('некорректный ID не допускает доступ к кэшу: %p', async id => {
  expect((await request({ id })).status).toHaveBeenCalledWith(400);
  expect(db.getUser).not.toHaveBeenCalled();
  expect(removeCache).not.toHaveBeenCalled();
});

test('несуществующий пользователь возвращает 404', async () => {
  user = null;
  expect((await request()).status).toHaveBeenCalledWith(404);
  expect(db.cancelAutoRenew).not.toHaveBeenCalled();
});

test('повторная отмена сохраняет доступ и баланс и повторно очищает кэш', async () => {
  const before = { ...user };
  for (let i = 0; i < 2; i++) {
    expect((await request()).json).toHaveBeenCalledWith(expect.objectContaining({
      success: true, auto_renew_disabled: true, has_payment_method: false,
    }));
  }
  expect(user).toEqual({ ...before, payment_method_id: null, auto_renew_disabled: true });
  expect(db.cancelAutoRenew).toHaveBeenNthCalledWith(1, 'web_test_123');
  expect(removeCache).toHaveBeenCalledTimes(2);
  expect(removeCache).toHaveBeenCalledWith(path.join(process.cwd(), 'data', 'users', 'web_test_123.json'));
});

test('отсутствующий кэш не мешает отмене', async () => {
  removeCache.mockImplementation(() => { throw Object.assign(new Error(), { code: 'ENOENT' }); });
  expect((await request()).status).toHaveBeenCalledWith(200);
});

test('ошибка БД не выдаётся за успешную отмену', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  db.cancelAutoRenew.mockRejectedValue(new Error('test'));
  expect((await request()).status).toHaveBeenCalledWith(500);
  expect(removeCache).not.toHaveBeenCalled();
});
