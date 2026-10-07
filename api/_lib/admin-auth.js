// api/_lib/admin-auth.js — Простая токен-аутентификация для админки
const crypto = require('crypto');

// Хранилище токенов в памяти {token: {createdAt, expiresAt}}
const tokens = new Map();
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 часа

function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error('ADMIN_PASSWORD environment variable is required');
  }
  return password;
}

function generateToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  tokens.set(token, {
    createdAt: now,
    expiresAt: now + TOKEN_TTL_MS,
    sessionId: crypto.randomUUID(),
    actorId: 'shared-admin',
    actorLabel: 'Общий администратор',
  });
  return token;
}

function getTokenEntry(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;

  const entry = tokens.get(token);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    tokens.delete(token);
    return null;
  }
  return entry;
}

function validateToken(req) {
  const entry = getTokenEntry(req);
  if (!entry) return false;
  req.adminAuth = entry;
  return true;
}

function checkAuth(req, res) {
  if (!validateToken(req)) {
    res.status(401).json({ error: 'Требуется авторизация' });
    return false;
  }
  return true;
}

// Сравнение через хеш уравнивает длину буферов (timingSafeEqual иначе бросает
// исключение при несовпадающей длине), поэтому сравнение по времени не зависит
// ни от длины введённого пароля, ни от того, сколько символов совпало с начала.
function safeCompare(a, b) {
  const bufA = crypto.createHash('sha256').update(String(a)).digest();
  const bufB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = { getAdminPassword, generateToken, getTokenEntry, validateToken, checkAuth, safeCompare };
