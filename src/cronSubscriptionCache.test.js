const mockGetExpiredToday = jest.fn();
const mockGetExpiringSubscriptions = jest.fn();
const mockDeactivateSubscription = jest.fn();
const mockDeleteUserCache = jest.fn();
const mockGetExpiredReminderCandidates = jest.fn();
const mockGetUser = jest.fn();
const mockHasEmailNotification = jest.fn();
const mockRecordEmailNotification = jest.fn();
const mockSendExpiredSubscriptionEmail = jest.fn();

jest.mock('../api/_lib/db', () => ({
  getExpiringSubscriptions: mockGetExpiringSubscriptions,
  getExpiredToday: mockGetExpiredToday,
  getExpiredReminderCandidates: mockGetExpiredReminderCandidates,
  getUser: mockGetUser,
  deactivateSubscription: mockDeactivateSubscription,
  renewSubscription: jest.fn(),
  recordPayment: jest.fn(),
  processReferralSHC: jest.fn(),
  hasEmailNotification: mockHasEmailNotification,
  recordEmailNotification: mockRecordEmailNotification,
  insertAuditLog: jest.fn().mockResolvedValue(1),
}));

jest.mock('../api/_lib/user-cache', () => ({
  deleteUserCache: mockDeleteUserCache,
}));

jest.mock('../api/admin-pricing', () => ({
  getPriceTable: () => ({ '290': { 1: 290 } }),
}));

jest.mock('../api/_lib/email-notifications', () => ({
  sendRenewalReminderEmail: jest.fn(),
  sendExpiredSubscriptionEmail: mockSendExpiredSubscriptionEmail,
}));

const { runSubscriptionCron } = require('../api/cron-subscriptions');

beforeEach(() => {
  jest.clearAllMocks();
  mockGetExpiringSubscriptions.mockResolvedValue([]);
  mockGetExpiredReminderCandidates.mockResolvedValue([]);
  mockHasEmailNotification.mockResolvedValue(false);
  mockRecordEmailNotification.mockResolvedValue(true);
  mockSendExpiredSubscriptionEmail.mockResolvedValue(true);
  mockGetExpiredToday.mockResolvedValue([{
    telegram_id: 'web_expired_123',
    tariff: '290',
    payment_method_id: null,
    auto_renew_disabled: false,
  }]);
});

test('отправляет по одному письму в день +1 и день +2 с разными ключами дедупликации', async () => {
  const user = {
    telegram_id: 'web_expired_123', email: 'client@example.test', name: 'Тест',
    subscription_status: 'неактивно', subscription_end: '06.10.2026',
  };
  mockGetExpiredToday.mockResolvedValue([]);
  mockGetExpiredReminderCandidates.mockResolvedValue([user]);
  mockGetUser.mockResolvedValue(user);

  const result = await runSubscriptionCron();

  expect(mockGetExpiredReminderCandidates.mock.calls.map(call => call[0])).toEqual([1, 2]);
  expect(mockSendExpiredSubscriptionEmail).toHaveBeenCalledWith('client@example.test', 'Тест', 1);
  expect(mockSendExpiredSubscriptionEmail).toHaveBeenCalledWith('client@example.test', 'Тест', 2);
  expect(mockRecordEmailNotification).toHaveBeenCalledWith('web_expired_123', 'subscription_expired_day_1', '06.10.2026');
  expect(mockRecordEmailNotification).toHaveBeenCalledWith('web_expired_123', 'subscription_expired_day_2', '06.10.2026');
  expect(result.expiredEmailsSent).toBe(2);
});

test('не напоминает после продления или при уже отправленном письме', async () => {
  const candidate = { telegram_id: 'web_expired_123', subscription_end: '06.10.2026' };
  mockGetExpiredToday.mockResolvedValue([]);
  mockGetExpiredReminderCandidates.mockResolvedValue([candidate]);
  mockGetUser.mockResolvedValueOnce({ ...candidate, email: 'client@example.test', subscription_status: 'активно' })
    .mockResolvedValueOnce({ ...candidate, email: 'client@example.test', subscription_status: 'неактивно' });
  mockHasEmailNotification.mockResolvedValue(true);

  const result = await runSubscriptionCron();

  expect(mockSendExpiredSubscriptionEmail).not.toHaveBeenCalled();
  expect(result.expiredEmailsSent).toBe(0);
});

test('крон удаляет кэш после деактивации подписки', async () => {
  const result = await runSubscriptionCron();

  expect(mockDeactivateSubscription).toHaveBeenCalledWith('web_expired_123');
  expect(mockDeleteUserCache).toHaveBeenCalledWith('web_expired_123');
  expect(result.deactivated).toBe(1);
});
