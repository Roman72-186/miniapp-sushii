import { getAnalyticsSessionId, resetAnalyticsForTests, trackPageView, trackProductEvent } from './analytics/productAnalytics';

describe('product analytics', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    resetAnalyticsForTests();
    global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
    Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: jest.fn(() => '123e4567-e89b-42d3-a456-426614174000') } });
    window.history.replaceState({}, '', '/');
  });

  test('keeps session id and rotates it after inactivity', () => {
    const first = getAnalyticsSessionId();
    expect(getAnalyticsSessionId()).toBe(first);
    sessionStorage.setItem('product_analytics_session', JSON.stringify({ id: first, lastActivity: Date.now() - 31 * 60 * 1000 }));
    crypto.randomUUID.mockReturnValueOnce('223e4567-e89b-42d3-a456-426614174000');
    expect(getAnalyticsSessionId()).not.toBe(first);
  });

  test('sends pathname without query or hash and deduplicates route in StrictMode', () => {
    trackPageView('/pay/490?phone=secret#form');
    trackPageView('/pay/490?phone=secret#form');
    expect(fetch).toHaveBeenCalledTimes(2); // page.view + payment_form_view only once
    const bodies = fetch.mock.calls.map(call => JSON.parse(call[1].body).events[0]);
    expect(bodies.every(event => event.pathname === '/pay/490')).toBe(true);
    expect(JSON.stringify(bodies)).not.toContain('secret');
  });

  test('does not send admin and test pages', () => {
    trackProductEvent('page.view', 'navigation', {}, { pathname: '/admin' });
    trackProductEvent('page.view', 'navigation', {}, { pathname: '/test/catalog' });
    expect(fetch).not.toHaveBeenCalled();
  });

  test('keeps previous pathname for a page transition after reload', () => {
    trackPageView('/shop');
    resetAnalyticsForTests();
    trackPageView('/discount-shop');
    const pageViews = fetch.mock.calls
      .map(call => JSON.parse(call[1].body).events[0])
      .filter(event => event.event_name === 'page.view');
    expect(pageViews.at(-1).previous_pathname).toBe('/shop');
  });
});
