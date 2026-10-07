const crypto = require('crypto');
const { getAuthenticatedUserId } = require('./auth');
const db = require('./db');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_FUNNELS = Object.freeze({
  'page.view': 'navigation',
  'subscription.landing_view': 'subscription',
  'subscription.tariff_selected': 'subscription',
  'subscription.payment_form_view': 'subscription',
  'subscription.payment_redirect': 'subscription',
  'order.catalog_view': 'order',
  'order.first_item_added': 'order',
  'order.cart_opened': 'order',
  'order.checkout_started': 'order',
  'order.submitted': 'order',
  'auth.login_view': 'auth',
  'auth.phone_submitted': 'auth',
  'auth.credentials_requested': 'auth',
  'auth.credentials_verified': 'auth',
  'auth.login_completed': 'auth',
});
const SERVER_EVENT_FUNNELS = Object.freeze({
  'subscription.payment_succeeded': 'subscription',
  'order.created': 'order',
});
const ALLOWED_EVENTS = new Set(Object.keys(EVENT_FUNNELS));
const ALLOWED_METADATA = new Set(['tariff', 'months', 'order_type', 'delivery_type', 'source', 'channel', 'campaign', 'error_stage']);

function containsPii(value) {
  const text = String(value || '');
  const digits = text.replace(/\D/g, '');
  return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(text) || digits.length >= 10;
}

function anonymizeUserId(userId) {
  if (!userId) return null;
  const secret = process.env.ANALYTICS_ID_HASH_SECRET || process.env.JWT_SECRET;
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(String(userId)).digest('hex');
}

function cleanPath(value, nullable = false) {
  if (value === null || value === undefined || value === '') return nullable ? null : '/';
  const path = String(value);
  if (!path.startsWith('/') || path.length > 300 || /[?#]/.test(path) || containsPii(path)) throw new Error('invalid_path');
  return path;
}

function clientKind(req) {
  const ua = String(req.headers['user-agent'] || '').toLowerCase();
  if (!ua) return 'unknown';
  if (/bot|crawler|spider/.test(ua)) return 'bot';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  if (/mobile|android|iphone/.test(ua)) return 'mobile';
  return 'desktop';
}

function sanitizeMetadata(input) {
  if (input === null || input === undefined) return {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_metadata');
  const result = {};
  for (const [key, raw] of Object.entries(input)) {
    if (!ALLOWED_METADATA.has(key)) throw new Error('unknown_metadata');
    if (!['string', 'number', 'boolean'].includes(typeof raw)) throw new Error('invalid_metadata');
    const value = typeof raw === 'string' ? raw.trim().slice(0, 100) : raw;
    if (typeof value === 'string' && containsPii(value)) throw new Error('pii_metadata');
    if (key === 'tariff' && !/^\d{1,5}$/.test(String(value))) throw new Error('invalid_metadata');
    if (key === 'months' && ![1, 3, 5].includes(Number(value))) throw new Error('invalid_metadata');
    if (key === 'order_type' && !['public', 'discount', 'subscription'].includes(String(value))) throw new Error('invalid_metadata');
    if (key === 'delivery_type' && !['pickup', 'delivery'].includes(String(value))) throw new Error('invalid_metadata');
    if (key === 'error_stage' && !['password', 'email', 'direct', 'otp'].includes(String(value))) throw new Error('invalid_metadata');
    if (['source', 'channel', 'campaign'].includes(key) && !/^[A-Za-z0-9._:-]{1,100}$/.test(String(value))) {
      throw new Error('invalid_metadata');
    }
    result[key] = value;
  }
  return result;
}

function normalizeEvent(input, req, userId = null) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_event');
  if (!UUID_RE.test(String(input.event_id || '')) || !UUID_RE.test(String(input.session_id || ''))) throw new Error('invalid_uuid');
  if (!ALLOWED_EVENTS.has(input.event_name) || EVENT_FUNNELS[input.event_name] !== input.funnel) throw new Error('unknown_event');
  return {
    eventId: String(input.event_id),
    occurredAt: new Date().toISOString(),
    sessionId: String(input.session_id),
    userId: anonymizeUserId(userId),
    eventName: input.event_name,
    funnel: input.funnel,
    pathname: cleanPath(input.pathname),
    previousPathname: cleanPath(input.previous_pathname, true),
    clientKind: clientKind(req),
    metadataJson: JSON.stringify(sanitizeMetadata(input.metadata)),
  };
}

async function recordServerAnalyticsEvent({ sessionId, userId = null, eventName, funnel, pathname = '/', metadata = {} }) {
  if (!UUID_RE.test(String(sessionId || ''))) return false;
  if (SERVER_EVENT_FUNNELS[eventName] !== funnel) return false;
  try {
    await db.insertAnalyticsEvent({
      eventId: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
      sessionId: String(sessionId),
      userId: anonymizeUserId(userId),
      eventName,
      funnel,
      pathname: cleanPath(pathname),
      previousPathname: null,
      clientKind: 'server',
      metadataJson: JSON.stringify(sanitizeMetadata(metadata)),
    });
    return true;
  } catch (error) {
    console.error('[analytics] server event failed:', error.message);
    return false;
  }
}

function authenticatedUser(req) {
  return getAuthenticatedUserId(req);
}

module.exports = {
  UUID_RE,
  ALLOWED_EVENTS,
  normalizeEvent,
  recordServerAnalyticsEvent,
  authenticatedUser,
};
