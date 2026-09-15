const mockGetExpiredToday = jest.fn();
const mockGetExpiringSubscriptions = jest.fn();
const mockDeactivateSubscription = jest.fn();
const mockDeleteUserCache = jest.fn();

jest.mock('../api/_lib/db', () => ({
  getExpiringSubscriptions: mockGetExpiringSubscriptions,
  getExpiredToday: mockGetExpiredToday,
  deactivateSubscription: mockDeactivateSubscription,
  renewSubscription: jest.fn(),
  recordPayment: jest.fn(),
  processReferralSHC: jest.fn(),
  hasEmailNotification: jest.fn(),
  recordEmailNotification: jest.fn(),
}));

jest.mock('../api/_lib/user-cache', () => ({
  deleteUserCache: mockDeleteUserCache,
}));

jest.mock('../api/admin-pricing', () => ({
  getPriceTable: () => ({ '290': { 1: 290 } }),
}));

jest.mock('../api/_lib/email-notifications', () => ({
  sendRenewalReminderEmail: jest.fn(),
}));

const { runSubscriptionCron } = require('../api/cron-subscriptions');

beforeEach(() => {
  jest.clearAllMocks();
  mockGetExpiringSubscriptions.mockResolvedValue([]);
  mockGetExpiredToday.mockResolvedValue([{
    telegram_id: 'web_expired_123',
    tariff: '290',
    payment_method_id: null,
    auto_renew_disabled: false,
  }]);
});

test('крон удаляет кэш после деактивации подписки', async () => {
  const result = await runSubscriptionCron();

  expect(mockDeactivateSubscription).toHaveBeenCalledWith('web_expired_123');
  expect(mockDeleteUserCache).toHaveBeenCalledWith('web_expired_123');
  expect(result.deactivated).toBe(1);
});
