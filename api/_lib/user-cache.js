// api/_lib/user-cache.js — Кэш пользователя в файловой системе (CommonJS)

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'users');

/**
 * Читает кэш пользователя из файла
 * @param {string} telegramId
 * @returns {object|null}
 */
async function readUserCache(telegramId) {
  try {
    const filePath = path.join(DATA_DIR, `${telegramId}.json`);
    const raw = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    console.error('readUserCache error:', err.message);
    return null;
  }
}

/**
 * Записывает кэш пользователя в файл
 * @param {string} telegramId
 * @param {object} data
 */
async function writeUserCache(telegramId, data) {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  const filePath = path.join(DATA_DIR, `${telegramId}.json`);
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tmpPath, JSON.stringify(data), 'utf8');
  await fs.promises.rename(tmpPath, filePath);
}

async function deleteUserCache(telegramId) {
  try {
    const filePath = path.join(DATA_DIR, `${telegramId}.json`);
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('deleteUserCache error:', err.message);
  }
}

module.exports = { readUserCache, writeUserCache, deleteUserCache };
