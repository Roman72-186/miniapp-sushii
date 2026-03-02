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
    const result = await list({ prefix: `${PREFIX}${telegramId}.json` });
    console.log('blob list result:', JSON.stringify({ count: result.blobs?.length, hasToken: !!process.env.BLOB_READ_WRITE_TOKEN }));
    if (!result.blobs || result.blobs.length === 0) return null;

    const blob = result.blobs[0];
    console.log('blob found:', JSON.stringify({ pathname: blob.pathname, hasDownloadUrl: !!blob.downloadUrl }));
    const downloadUrl = blob.downloadUrl || blob.url;
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      console.log('blob fetch failed:', res.status);
      return null;
    }
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
    allowOverwrite: true,
  });
}

module.exports = { readGiftWindows, writeGiftWindows };
