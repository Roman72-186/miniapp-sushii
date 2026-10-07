const SESSION_KEY = 'product_analytics_session';
const SESSION_TTL_MS = 30 * 60 * 1000;
const EXCLUDED_PREFIXES = ['/admin', '/test'];

const GOAL_EVENTS = {
  auth_phone_start: ['auth.phone_submitted', 'auth'],
  auth_phone_success: ['auth.login_completed', 'auth'],
  email_otp_success: ['auth.credentials_verified', 'auth'],
  password_set_success: ['auth.credentials_verified', 'auth'],
  cart_add: ['order.first_item_added', 'order'],
  cart_open: ['order.cart_opened', 'order'],
  checkout_start: ['order.checkout_started', 'order'],
  payment_redirect: ['subscription.payment_redirect', 'subscription'],
};

let lastPageKey = '';

function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const value = Math.floor(Math.random() * 16);
    return (char === 'x' ? value : ((value & 0x3) | 0x8)).toString(16);
  });
}

function cleanPath(value) {
  const raw = String(value || '/').split(/[?#]/, 1)[0] || '/';
  return raw.startsWith('/') ? raw.slice(0, 300) : '/';
}

function readSession() {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || 'null');
    if (!parsed?.id || !parsed?.lastActivity || Date.now() - parsed.lastActivity > SESSION_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getAnalyticsSessionId() {
  if (typeof window === 'undefined') return null;
  const current = readSession() || { id: uuid() };
  current.lastActivity = Date.now();
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(current));
  return current.id;
}

function updateSessionPath(pathname) {
  if (typeof window === 'undefined') return { id: null, previousPathname: null };
  const current = readSession() || { id: uuid() };
  const previousPathname = current.lastPath || null;
  current.lastPath = pathname;
  current.lastActivity = Date.now();
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(current));
  return { id: current.id, previousPathname };
}

function safeMetadata(metadata = {}) {
  const allowed = ['tariff', 'months', 'order_type', 'delivery_type', 'source', 'channel', 'campaign', 'error_stage'];
  return allowed.reduce((result, key) => {
    const value = metadata[key];
    if (value === null || value === undefined || value === '') return result;
    result[key] = typeof value === 'number' ? value : String(value).slice(0, 100);
    return result;
  }, {});
}

export function trackProductEvent(eventName, funnel, metadata = {}, options = {}) {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  const pathname = cleanPath(options.pathname || window.location.pathname);
  if (EXCLUDED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))) return;

  const event = {
    event_id: uuid(),
    session_id: getAnalyticsSessionId(),
    event_name: eventName,
    funnel,
    pathname,
    previous_pathname: options.previousPathname ? cleanPath(options.previousPathname) : null,
    metadata: safeMetadata(metadata),
  };

  const token = window.localStorage?.getItem('web_token');
  fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ events: [event] }),
    keepalive: true,
  }).catch(() => {});
}

export function trackPageView(pathname, previousPathname = null) {
  const path = cleanPath(pathname);
  if (EXCLUDED_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`))) return;
  const session = updateSessionPath(path);
  const sessionId = session.id;
  const previous = previousPathname ? cleanPath(previousPathname) : session.previousPathname;
  const key = `${sessionId}:${path}`;
  if (lastPageKey === key) return;
  lastPageKey = key;

  trackProductEvent('page.view', 'navigation', {}, { pathname: path, previousPathname: previous });
  if (path === '/benefits') trackProductEvent('subscription.landing_view', 'subscription', {}, { pathname: path, previousPathname: previous });
  if (path.startsWith('/pay/')) {
    trackProductEvent('subscription.payment_form_view', 'subscription', { tariff: path.split('/')[2] || '' }, { pathname: path, previousPathname: previous });
  }
  if (path === '/discount-shop' || path === '/shop') {
    trackProductEvent('order.catalog_view', 'order', { order_type: path === '/shop' ? 'public' : 'discount' }, { pathname: path, previousPathname: previous });
  }
  if (path === '/login') trackProductEvent('auth.login_view', 'auth', {}, { pathname: path, previousPathname: previous });
}

export function trackMetrikaGoal(goalId, params = {}) {
  const mapping = GOAL_EVENTS[goalId];
  if (!mapping) return;
  trackProductEvent(mapping[0], mapping[1], {
    tariff: params.tariff,
    months: params.months,
    order_type: params.order_type,
    delivery_type: params.delivery_type,
  });
}

export function resetAnalyticsForTests() {
  lastPageKey = '';
}
