// api/game-stats.js — статистика игры пользователя

const { authMiddleware } = require('./_lib/auth');
const { getUser, getGameStats } = require('./_lib/db');
const { getGameDay } = require('./_lib/wordle-logic');
const { deriveFromDbUser } = require('./_lib/subscription-state');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://sushi-house-39.ru');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await new Promise((resolve, reject) => {
      authMiddleware(req, res, (err) => err ? reject(err) : resolve());
    });
  } catch {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });

  try {
    const user = await getUser(userId);
    const { subscriptionStatus } = deriveFromDbUser(user);
    const isSubscriber = subscriptionStatus === 'активно';

    const gameDay = getGameDay();
    const { winsToday } = isSubscriber ? getGameStats(userId, gameDay) : { winsToday: 0 };
    const remainingWins = Math.max(0, 3 - winsToday);

    return res.status(200).json({
      success: true,
      isSubscriber,
      winsToday,
      remainingWins,
      maxWins: 3,
      gameDay,
    });
  } catch (err) {
    console.error('game-stats error:', err.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
