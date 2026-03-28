// api/_lib/auth.js — JWT аутентификация

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware для проверки JWT токена
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    req.authMethod = 'jwt';
    next();
  } catch (e) {
    console.error('[authMiddleware] Ошибка токена:', e.message);
    return res.status(401).json({ error: 'Неверный токен' });
  }
}

/**
 * Генерация JWT токена
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.telegram_id || user.id,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Генерация Refresh токена
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.telegram_id || user.id },
    JWT_SECRET + '_refresh',
    { expiresIn: '30d' }
  );
}

module.exports = {
  authMiddleware,
  generateToken,
  generateRefreshToken,
  JWT_SECRET,
};
