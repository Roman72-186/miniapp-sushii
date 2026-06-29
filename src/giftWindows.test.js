const { computeStatus } = require('../api/_lib/gift-windows');

describe('gift window status', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('keeps a gift available on the window end date', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-29T12:00:00Z'));

    expect(computeStatus([
      { num: 1, start: '14.06.2026', end: '29.06.2026', status: 'available', claimedAt: null },
    ])).toMatchObject({
      currentStatus: 'available',
      currentWindow: 1,
      totalWindows: 1,
    });
  });

  test('expires a gift on the day after the window end date', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-30T00:00:00Z'));

    expect(computeStatus([
      { num: 1, start: '14.06.2026', end: '29.06.2026', status: 'available', claimedAt: null },
    ])).toMatchObject({
      currentStatus: 'expired',
      currentWindow: 1,
      totalWindows: 1,
    });
  });
});
