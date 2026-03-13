// api/_lib/blob-store.js — Хранение подарочных окон в файловой системе (CommonJS)

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'gifts');

/**
 * Читает JSON подарочных окон для пользователя
 * @param {string} telegramId
 * @returns {object|null}
 */
async function readGiftWindows(telegramId) {
  try {
    const filePath = path.join(DATA_DIR, `${telegramId}.json`);
    const raw = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    console.error('readGiftWindows error:', err.message);
    return null;
  }
}

/**
 * Записывает JSON подарочных окон для пользователя
 * @param {string} telegramId
 * @param {object} data
 */
async function writeGiftWindows(telegramId, data) {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  const filePath = path.join(DATA_DIR, `${telegramId}.json`);
  await fs.promises.writeFile(filePath, JSON.stringify(data), 'utf8');
}

module.exports = { readGiftWindows, writeGiftWindows };
