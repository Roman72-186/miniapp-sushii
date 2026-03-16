const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// API routes (handlers manage CORS and method checks internally)
app.all('/api/sync-user', require('./api/sync-user'));
app.all('/api/get-profile', require('./api/get-profile'));
app.all('/api/get-referrals', require('./api/get-referrals'));
app.all('/api/create-order', require('./api/create-order'));
app.all('/api/order', require('./api/order'));
app.all('/api/create-payment', require('./api/create-payment'));
app.all('/api/yookassa-webhook', require('./api/yookassa-webhook'));
app.all('/api/claim-gift', require('./api/claim-gift'));
app.all('/api/check-vip', require('./api/check-vip'));
app.all('/api/cancel-subscription', require('./api/cancel-subscription'));
app.all('/api/get-gift-windows', require('./api/get-gift-windows'));
app.all('/api/export-contacts', require('./api/export-contacts'));
app.all('/api/get-transactions', require('./api/get-transactions'));
app.all('/api/register-referral', require('./api/register-referral'));
app.all('/api/send-bot-message', require('./api/send-bot-message'));
app.all('/api/cron-subscriptions', require('./api/cron-subscriptions'));

// Admin API
app.all('/api/admin/login', require('./api/admin-login'));
app.all('/api/admin/products', require('./api/admin-products'));
app.all('/api/admin/subscribers', require('./api/admin-subscribers'));
app.all('/api/admin/grant-gift', require('./api/admin-grant-gift'));

// no-cache для JSON и HTML (чтобы админские правки и обновления подхватывались сразу)
function noCacheHeaders(res, filePath) {
  if (filePath.endsWith('.json') || filePath.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}

// Serve product overrides from persistent volume (admin edits), then React build
app.use(express.static(path.join(__dirname, 'data', 'products'), { setHeaders: noCacheHeaders }));
app.use(express.static(path.join(__dirname, 'build'), { setHeaders: noCacheHeaders }));

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

  // Cron: проверка подписок каждый день в 10:00 UTC (13:00 МСК)
  const { runSubscriptionCron } = require('./api/cron-subscriptions');

  function scheduleDailyCron() {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(10, 0, 0, 0);
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
});
