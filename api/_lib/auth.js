// api/_lib/auth.js — JWT аутентификация

const jwt = require('jsonwebtoken');

// Раньше при отсутствии JWT_SECRET сервер тихо подписывал токены публично
// известной строкой-заглушкой — на проде это уже привело к живому инциденту
// (см. session-handoffs): в .env оказалось скопировано ЗНАЧЕНИЕ подсказки из
// server.js вместо настоящего секрета. Теперь при отсутствии секрета или при
// использовании известных заглушек падаем на старте вместо тихой деградации
// до предсказуемого значения.
const KNOWN_PLACEHOLDER_VALUES = new Set([
  'your-secret-key-change-in-production',
  'your-super-secret-jwt-key-change-this-in-production-$(openssl rand -hex 32)',
]);
if (!process.env.JWT_SECRET || KNOWN_PLACEHOLDER_VALUES.has(process.env.JWT_SECRET)) {
  throw new Error('JWT_SECRET не задан или равен публично известной заглушке из кода/документации. Сгенерируйте случайный секрет (например, openssl rand -base64 48) и укажите его в .env — без него сервер не может безопасно подписывать токены.');
}
const JWT_SECRET = process.env.JWT_SECRET;

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
 * Возвращает userId из Bearer-токена без ответа 401 — для эндпоинтов,
 * где identity опциональна (гостевой чекаут), но если она заявлена
 * в теле запроса, должна быть подтверждена собственным JWT.
 */
function getAuthenticatedUserId(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.userId || null;
  } catch (e) {
    return null;
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
  getAuthenticatedUserId,
  generateToken,
  generateRefreshToken,
  JWT_SECRET,
};
