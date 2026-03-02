// api/lib/blob-store.js — Обёртка над Vercel Blob для хранения подарочных окон (CommonJS)

const { put, list, getDownloadUrl } = require('@vercel/blob');

const PREFIX = 'gifts/';

/**
 * Читает JSON подарочных окон для пользователя
 * @param {string} telegramId
 * @returns {object|null} данные или null если не существует
 */
async function readGiftWindows(telegramId) {
  try {
    const { blobs } = await list({ prefix: `${PREFIX}${telegramId}.json` });
    if (!blobs || blobs.length === 0) return null;

    const downloadUrl = blobs[0].downloadUrl || blobs[0].url;
    const res = await fetch(downloadUrl);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
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
  const body = JSON.stringify(data);
  await put(`${PREFIX}${telegramId}.json`, body, {
    contentType: 'application/json',
    access: 'private',
    addRandomSuffix: false,
  });
}

module.exports = { readGiftWindows, writeGiftWindows };
