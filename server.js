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
app.all('/api/migrate-referrals', require('./api/migrate-referrals'));
app.all('/api/migrate-subscribers', require('./api/migrate-subscribers'));

// Admin API
app.all('/api/admin/login', require('./api/admin-login'));
app.all('/api/admin/products', require('./api/admin-products'));
app.all('/api/admin/subscribers', require('./api/admin-subscribers'));

// Serve product overrides from persistent volume (admin edits), then React build
app.use(express.static(path.join(__dirname, 'data', 'products')));
app.use(express.static(path.join(__dirname, 'build')));

// SPA fallback — all non-API routes serve index.html
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
