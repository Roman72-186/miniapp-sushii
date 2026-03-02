// api/_lib/user-cache.js — Кэш пользователя в Vercel Blob (CommonJS)

const { put, list } = require('@vercel/blob');

const PREFIX = 'users/';

/**
 * Читает кэш пользователя из Vercel Blob
 * @param {string} telegramId
 * @returns {object|null}
 */
async function readUserCache(telegramId) {
  try {
    const { blobs } = await list({ prefix: `${PREFIX}${telegramId}.json` });
    if (!blobs || blobs.length === 0) return null;

    const res = await fetch(blobs[0].url, {
      headers: { 'Authorization': 'Bearer ' + process.env.BLOB_READ_WRITE_TOKEN },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('readUserCache error:', err.message);
    return null;
  }
}

/**
 * Записывает кэш пользователя в Vercel Blob
 * @param {string} telegramId
 * @param {object} data
 */
async function writeUserCache(telegramId, data) {
  const body = JSON.stringify(data);
  await put(`${PREFIX}${telegramId}.json`, body, {
    contentType: 'application/json',
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

module.exports = { readUserCache, writeUserCache };
