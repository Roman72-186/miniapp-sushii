// api/_lib/admin-auth.js — Простая токен-аутентификация для админки
const crypto = require('crypto');

// Хранилище токенов в памяти {token: {createdAt, expiresAt}}
const tokens = new Map();
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 часа

function getAdminPassword() {
  console.log('DEBUG: process.env.ADMIN_PASSWORD =', process.env.ADMIN_PASSWORD);
  const password = process.env.ADMIN_PASSWORD || 'test123'; // временно для тестирования
  console.log('DEBUG: final password =', password);
  if (!password) {
    console.error('SECURITY ISSUE: ADMIN_PASSWORD environment variable is required but not set');
    console.error('Please set ADMIN_PASSWORD in your .env file before starting the server');
    throw new Error('ADMIN_PASSWORD environment variable is required');
  }
  return password;
}

function generateToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  tokens.set(token, { createdAt: now, expiresAt: now + TOKEN_TTL_MS });
  return token;
}

function validateToken(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return false;

  const entry = tokens.get(token);
  if (!entry) return false;

  if (Date.now() > entry.expiresAt) {
    tokens.delete(token);
    return false;
  }
  return true;
}

function checkAuth(req, res) {
  if (!validateToken(req)) {
    res.status(401).json({ error: 'Требуется авторизация' });
    return false;
  }
  return true;
}

module.exports = { getAdminPassword, generateToken, validateToken, checkAuth };
