const http = require('http');

const data = JSON.stringify({
  telegram_id: '999999999',
  name: 'Test User',
  tariff: '490',
  subscription_start: '26.03.2026',
  subscription_end: '26.04.2026',
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/admin/add-user-manual',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Response:', JSON.parse(body));
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(data);
req.end();
