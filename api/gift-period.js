const fs = require('fs').promises;
const path = require('path');

/**
 * Получение информации о периоде подарков
 * @param {Object} req - запрос
 * @param {Object} res - ответ
 */
module.exports = async (req, res) => {
  try {
    // Временная реализация - возвращаем фиктивные данные
    // В реальном приложении здесь должна быть логика проверки текущего периода
    const giftPeriod = {
      active: true, // По умолчанию период активен
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Через неделю
      message: "Подарки доступны только в определённые периоды"
    };

    res.json(giftPeriod);
  } catch (error) {
    console.error('Ошибка получения информации о периоде подарков:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};