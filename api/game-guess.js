// api/game-guess.js — проверка попытки в игре «Пятибуквенное слово»

const { authMiddleware } = require('./_lib/auth');
const { getUser, getGameDailyWord, recordGameWin, getGameWordExists } = require('./_lib/db');
const { calculateGuessResult, CELL_STATUS, getGameDay } = require('./_lib/wordle-logic');
const { deriveFromDbUser } = require('./_lib/subscription-state');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://sushi-house-39.ru');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // JWT авторизация
  try {
    await new Promise((resolve, reject) => {
      authMiddleware(req, res, (err) => err ? reject(err) : resolve());
    });
  } catch {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });

  // Проверка подписки
  const user = await getUser(userId);
  if (!user) return res.status(403).json({ error: 'Пользователь не найден' });

  const { subscriptionStatus } = deriveFromDbUser(user);
  if (subscriptionStatus !== 'активно') {
    return res.status(403).json({ error: 'Игра доступна только для подписчиков', code: 'not_subscriber' });
  }

  const { word, attempt } = req.body || {};

  // Валидация
  if (!word || typeof word !== 'string') return res.status(400).json({ error: 'Слово обязательно' });
  const cleaned = word.trim().toLowerCase();
  if (cleaned.length !== 5) return res.status(400).json({ error: 'Слово должно содержать 5 букв' });
  if (!/^[а-яё]{5}$/.test(cleaned)) return res.status(400).json({ error: 'Слово должно содержать только русские буквы' });

  const wordInDict = await getGameWordExists(cleaned);
  if (!wordInDict) return res.status(400).json({ error: 'Такого слова нет в словаре' });

  try {
    const gameDay = getGameDay();
    const dailyWordRow = await getGameDailyWord(gameDay);
    if (!dailyWordRow) return res.status(500).json({ error: 'Слово дня не найдено' });

    const result = calculateGuessResult(cleaned, dailyWordRow.word);
    const isWon = result.every(c => c.status === CELL_STATUS.CORRECT);

    let winsToday = null;
    let shcEarned = false;

    if (isWon) {
      const { winsToday: prev } = await require('./_lib/db').getGameStats(userId, gameDay);
      if (prev < 3) {
        winsToday = await recordGameWin(userId, gameDay);
        shcEarned = true;
      } else {
        winsToday = prev;
      }
    }

    const isLastAttempt = Number(attempt) >= 6;
    const response = { result, isWon };

    if (isWon) {
      response.winsToday = winsToday;
      response.shcEarned = shcEarned ? 3 : 0;
    }

    if (isLastAttempt && !isWon) {
      response.reveal = dailyWordRow.word;
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error('game-guess error:', err.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
