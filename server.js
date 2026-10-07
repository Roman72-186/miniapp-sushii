const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { auditHttp } = require('./api/_lib/audit-log');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '8mb' }));
app.use((req, res, next) => {
  const incomingRequestId = String(req.headers['x-request-id'] || '');
  req.requestId = crypto.randomUUID();
  req.correlationId = /^[A-Za-z0-9._:-]{1,100}$/.test(incomingRequestId)
    ? incomingRequestId
    : null;
  res.setHeader('X-Request-ID', req.requestId);
  next();
});
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  next();
});

// API routes (handlers manage CORS and method checks internally)
app.all('/api/sync-user', require('./api/sync-user'));
app.all('/api/get-profile', require('./api/get-profile'));
app.all('/api/get-referrals', require('./api/get-referrals'));
app.all('/api/create-order', auditHttp({ eventName: status => status < 400 ? 'user.order.created' : 'user.order.failed', metadataFields: ['total_price', 'delivery_type'] }), require('./api/create-order'));
app.all('/api/order', require('./api/order'));
app.all('/api/create-payment', auditHttp({ eventName: 'user.payment.created' }), require('./api/create-payment'));
app.all('/api/yookassa-webhook', require('./api/yookassa-webhook'));
app.all('/api/claim-gift', auditHttp({ eventName: 'user.gift.claimed', metadataFields: ['window_num', 'gift_type'] }), require('./api/claim-gift'));
app.all('/api/check-vip', require('./api/check-vip'));
app.all('/api/cancel-subscription', auditHttp({ eventName: 'user.subscription.auto_renew_disabled' }), require('./api/cancel-subscription'));
app.all('/api/get-gift-windows', require('./api/get-gift-windows'));
app.all('/api/export-contacts', require('./api/export-contacts'));
app.all('/api/get-transactions', require('./api/get-transactions'));
app.all('/api/register-referral', auditHttp({ eventName: 'user.referral.registered' }), require('./api/register-referral'));
app.all('/api/apply-partner-code', auditHttp({ eventName: 'user.partner_code.applied' }), require('./api/apply-partner-code'));
app.all('/api/send-bot-message', require('./api/send-bot-message'));
app.all('/api/cron-subscriptions', require('./api/cron-subscriptions'));
app.all('/api/nearest-store', require('./api/nearest-store'));
app.all('/api/address-suggest', require('./api/address-suggest'));
app.all('/api/get-gift-history', require('./api/get-gift-history'));
app.all('/api/get-order-history', require('./api/get-order-history'));
app.all('/api/user-order-rating', require('./api/user-order-rating'));
app.all('/api/update-profile', auditHttp({ eventName: 'user.profile.updated', changeFields: ['first_name', 'last_name', 'middle_name', 'phone'] }), require('./api/update-profile'));
app.all('/api/upload-avatar', require('./api/upload-avatar'));
app.all('/api/image', require('./api/image'));

// Auth API
app.all('/api/auth/login-by-phone', auditHttp({
  eventName: (status, req) => status >= 400 ? 'user.auth.login_failed' : (req.auditAuthenticated ? 'user.auth.login_succeeded' : null),
  targetType: 'auth_session',
}), require('./api/auth/login-by-phone'));
app.all('/api/auth/verify-otp', auditHttp({ eventName: 'user.auth.otp_verified', targetType: 'auth_session' }), require('./api/auth/verify-otp'));
app.all('/api/auth/verify-password-otp', require('./api/auth/verify-password-otp'));
app.all('/api/auth/login-with-password', auditHttp({ eventName: status => status < 400 ? 'user.auth.login_succeeded' : 'user.auth.login_failed', targetType: 'auth_session' }), require('./api/auth/login-with-password'));
app.all('/api/auth/set-password', auditHttp({ eventName: 'user.auth.password_set', targetType: 'auth_session' }), require('./api/auth/set-password'));
app.all('/api/auth/send-email-otp', require('./api/auth/send-email-otp'));

// Admin API
app.all('/api/admin/login', auditHttp({
  eventName: status => status === 429 ? 'admin.auth.login_rate_limited' : (status < 400 ? 'admin.auth.login_succeeded' : 'admin.auth.login_failed'),
  actorType: 'staff',
  targetType: 'admin_session',
}), require('./api/admin-login'));
app.all('/api/admin/audit-log', require('./api/admin-audit-log'));
app.all('/api/admin/products', auditHttp({ eventName: 'admin.product.updated', actorType: 'staff', targetType: 'product', metadataFields: ['catalog', 'index', 'enabled', 'price', 'discount'] }), require('./api/admin-products'));
app.all('/api/admin/subscribers', require('./api/admin-subscribers'));
app.all('/api/admin/grant-gift', auditHttp({ eventName: 'admin.gift.granted', actorType: 'staff', metadataFields: ['type'] }), require('./api/admin-grant-gift'));
app.all('/api/admin/claim-gift', auditHttp({ eventName: 'admin.gift.claimed', actorType: 'staff', metadataFields: ['type'] }), require('./api/admin-claim-gift'));
app.all('/api/admin/reset-subscription', auditHttp({ eventName: 'admin.subscription.reset', actorType: 'staff' }), require('./api/admin-reset-subscription'));
app.all('/api/admin/cancel-subscription', auditHttp({ eventName: 'admin.subscription.auto_renew_disabled', actorType: 'staff' }), require('./api/admin-cancel-subscription'));
app.all('/api/admin/extend-subscription', auditHttp({ eventName: 'admin.subscription.extended', actorType: 'staff', metadataFields: ['days'] }), require('./api/admin-extend-subscription'));
app.all('/api/admin/user-notes', auditHttp({ eventName: 'admin.user.notes_updated', actorType: 'staff', changeFields: ['notes'] }), require('./api/admin-user-notes'));
app.all('/api/admin/stats', require('./api/admin-stats'));
app.all('/api/admin/banners', auditHttp({
  eventName: (_status, req) => req.method === 'DELETE' ? 'admin.banner.deleted' : 'admin.banner.updated',
  actorType: 'staff', targetType: 'banner', metadataFields: ['slot', 'action'],
}), require('./api/admin-banners'));
app.all('/api/admin/pricing', auditHttp({ eventName: 'admin.pricing.updated', actorType: 'staff', targetType: 'pricing' }), require('./api/admin-pricing'));
app.all('/api/admin/add-user-manual', auditHttp({ eventName: 'admin.user.created_or_updated', actorType: 'staff' }), require('./api/admin/add-user-manual'));
app.all('/api/admin/user-tags', auditHttp({ eventName: 'admin.user.tag_changed', actorType: 'staff', metadataFields: ['action', 'tag'], changeFields: ['tag'] }), require('./api/admin-user-tags'));
app.all('/api/admin/set-subscription', auditHttp({ eventName: 'admin.subscription.set', actorType: 'staff', metadataFields: ['tariff', 'end_date'], changeFields: ['tariff', 'end_date'] }), require('./api/admin-set-subscription'));
app.all('/api/admin/gift-orders', require('./api/admin-gift-orders'));
app.all('/api/admin/add-product', auditHttp({ eventName: 'admin.product.created', actorType: 'staff', targetType: 'product', metadataFields: ['catalog'] }), require('./api/admin-add-product'));
app.all('/api/admin/referrals', require('./api/admin-referrals'));
app.all('/api/admin/update-user', auditHttp({ eventName: 'admin.user.profile_updated', actorType: 'staff', changeFields: ['first_name', 'last_name', 'middle_name', 'phone'] }), require('./api/admin-update-user'));
app.all('/api/admin/add-shc', auditHttp({ eventName: 'admin.user.shc_adjusted', actorType: 'staff', metadataFields: ['amount'] }), require('./api/admin-add-shc'));
app.get('/api/upsell-items', require('./api/upsell-items'));
app.post('/api/admin/upsell-toggle', auditHttp({ eventName: 'admin.upsell.changed', actorType: 'staff', targetType: 'product', targetId: req => req.body?.sku || null, metadataFields: ['action'] }), require('./api/admin/upsell-toggle'));
app.post('/api/admin/upsell-clear', auditHttp({ eventName: 'admin.upsell.cleared', actorType: 'staff', targetType: 'upsell' }), require('./api/admin/upsell-clear'));
app.get('/api/gift-items', require('./api/gift-items'));
app.post('/api/admin/promo-gift-toggle', auditHttp({ eventName: 'admin.gift_rule.updated', actorType: 'staff', targetType: 'product', targetId: req => req.body?.sku || null, metadataFields: ['action'] }), require('./api/admin/promo-gift-toggle'));
app.post('/api/admin/threshold-gift-toggle', auditHttp({ eventName: 'admin.gift_rule.updated', actorType: 'staff', targetType: 'product', targetId: req => req.body?.sku || null, metadataFields: ['action'] }), require('./api/admin/threshold-gift-toggle'));
app.all('/api/admin/gift-rules', auditHttp({
  eventName: (_status, req) => req.method === 'POST'
    ? 'admin.gift_rule.created'
    : (req.method === 'DELETE' ? 'admin.gift_rule.deleted' : 'admin.gift_rule.updated'),
  actorType: 'staff', targetType: 'gift_rule', targetId: req => req.body?.id || null,
  metadataFields: ['type', 'threshold', 'enabled'],
}), require('./api/admin/gift-rules'));

// Stores config + admin
app.get('/api/stores-config', require('./api/stores-config'));
app.all('/api/admin/stores', auditHttp({ eventName: 'admin.store.updated', actorType: 'staff', targetType: 'store', targetId: req => req.body?.pointId || null, metadataFields: ['enabled'] }), require('./api/admin-stores'));

// Game API
app.post('/api/game-guess', require('./api/game-guess'));
app.get('/api/game-stats', require('./api/game-stats'));

// no-cache для JSON и HTML (чтобы админские правки и обновления подхватывались сразу)
function noCacheHeaders(res, filePath) {
  if (filePath.endsWith('.json') || filePath.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}

function robotsNoIndex(req, res, next) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  next();
}

[
  '/api',
  '/admin',
  '/profile',
  '/settings',
  '/pay',
  '/login',
  '/partner-code',
  '/complete-registration',
  '/success',
  '/gift-rolls',
  '/gift-sets',
  '/sets-received',
  '/game',
  '/test',
].forEach(route => app.use(route, robotsNoIndex));

// Serve product overrides from persistent volume (admin edits), then React build
app.use('/data/banners', express.static(path.join(__dirname, 'data', 'banners'), { setHeaders: noCacheHeaders }));
app.use('/data/product-images', express.static(
  path.join(__dirname, 'data', 'product-images'),
  { setHeaders: (res, fp) => {
    if (/\.(jpg|jpeg|png|webp)$/i.test(fp))
      res.setHeader('Cache-Control', 'public, max-age=604800');
  }}
));
app.use('/data/avatars', express.static(
  path.join(__dirname, 'data', 'avatars'),
  { setHeaders: (res, fp) => {
    if (/\.(jpg|jpeg|png|webp)$/i.test(fp))
      res.setHeader('Cache-Control', 'public, max-age=604800');
  }}
));
app.use(express.static(path.join(__dirname, 'data', 'products'), { setHeaders: noCacheHeaders }));

// Admin pages — serve BEFORE React build
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));

app.use(express.static(path.join(__dirname, 'build'), { setHeaders: noCacheHeaders }));

function sendLatestStaticAsset(req, res, next) {
  const match = req.path.match(/^\/static\/(js|css)\/main\.[a-f0-9]+\.(js|css)$/);
  if (!match) return next();

  const [, dir, ext] = match;
  const staticDir = path.join(__dirname, 'build', 'static', dir);
  try {
    const latest = require('fs')
      .readdirSync(staticDir)
      .filter(name => name.startsWith('main.') && name.endsWith(`.${ext}`) && !name.endsWith('.map'))
      .sort()
      .pop();
    if (latest) {
      if (ext === 'js') res.type('application/javascript');
      if (ext === 'css') res.type('text/css');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(path.join(staticDir, latest));
    }
  } catch (err) {
    console.warn('[static-fallback] failed:', err.message);
  }
  return next();
}

app.get('/static/{*splat}', sendLatestStaticAsset);

// SPA fallback — all non-API routes serve index.html (no-cache для Telegram WebView)
app.get('/{*splat}', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Проверка критичных переменных окружения. JWT_SECRET сюда уже не попадает —
  // api/_lib/auth.js падает при require() (задолго до app.listen), если секрет
  // не задан или равен известной заглушке.
  if (!process.env.RESEND_API_KEY) {
    console.warn('[config] Внимание: RESEND_API_KEY не задана — отправка email через Resend отключена');
  }

  // Cron: проверка подписок каждый день в 10:00:00 МСК (07:00 UTC)
  const { runSubscriptionCron } = require('./api/cron-subscriptions');

  function scheduleDailyCron() {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(7, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    const delay = next.getTime() - now.getTime();
    console.log(`cron: next subscription check scheduled at ${next.toISOString()} (in ${Math.round(delay / 60000)} min)`);

    setTimeout(() => {
      runSubscriptionCron().catch(err => console.error('cron error:', err));
      // Перезапланировать на следующий день
      scheduleDailyCron();
    }, delay);
  }

  scheduleDailyCron();

  // Еженедельный синк словаря игры (воскресенье, 03:00 UTC)
  async function runDictSync() {
    try {
      const useSupabase = process.env.USE_SUPABASE === 'true';
      const { syncGameDictionary } = useSupabase
        ? require('./api/_lib/db-pg')
        : require('./api/_lib/db');
      await syncGameDictionary();
    } catch (err) {
      console.error('[dict-sync] ошибка:', err.message);
    }
  }

  function scheduleWeeklyDictSync() {
    const now = new Date();
    const next = new Date(now);
    const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
    next.setUTCDate(now.getUTCDate() + daysUntilSunday);
    next.setUTCHours(3, 0, 0, 0);

    const delay = next.getTime() - now.getTime();
    console.log(`dict-sync: следующий синк словаря ${next.toISOString()} (через ${Math.round(delay / 60000)} мин)`);

    setTimeout(() => {
      runDictSync();
      scheduleWeeklyDictSync();
    }, delay);
  }

  scheduleWeeklyDictSync();
});
