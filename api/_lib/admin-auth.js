// api/_lib/admin-auth.js — Простая токен-аутентификация для админки
const crypto = require('crypto');

// Хранилище токенов в памяти {token: {createdAt, expiresAt}}
const tokens = new Map();
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 часа

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || 'admin2026';
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
