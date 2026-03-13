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

// Serve React build
app.use(express.static(path.join(__dirname, 'build')));

// SPA fallback — all non-API routes serve index.html
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
