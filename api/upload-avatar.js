const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const { authMiddleware } = require('./_lib/auth');
const { getUser, updateUserAvatar } = require('./_lib/db');
const { deleteUserCache } = require('./_lib/user-cache');

const AVATAR_DIR = path.join(__dirname, '..', 'data', 'avatars');
const MAX_INPUT_BYTES = 2 * 1024 * 1024;

function safeUserPart(userId) {
  return String(userId || 'user').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

async function removePreviousAvatar(avatarUrl) {
  if (!avatarUrl || !String(avatarUrl).startsWith('/data/avatars/')) return;
  const filename = path.basename(String(avatarUrl));
  const target = path.resolve(AVATAR_DIR, filename);
  const root = path.resolve(AVATAR_DIR);
  if (!target.startsWith(root + path.sep)) return;
  try { await fs.unlink(target); } catch {}
}

module.exports = async (req, res) => {
  const allowedOrigins = ['https://sushi-house-39.ru', 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  return authMiddleware(req, res, async () => {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const currentUser = await getUser(req.userId);
      if (!currentUser) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      if (body.reset === true) {
        await removePreviousAvatar(currentUser.avatar_url);
        const updated = await updateUserAvatar(req.userId, null);
        try { await deleteUserCache(req.userId); } catch {}
        return res.status(200).json({ success: true, avatar_url: null, user: updated });
      }

      const imageData = String(body.imageData || '');
      const match = imageData.match(/^data:image\/(png|jpe?g|webp);base64,([a-zA-Z0-9+/=]+)$/);
      if (!match) {
        return res.status(400).json({ error: 'Загрузите изображение PNG, JPG или WEBP' });
      }

      const input = Buffer.from(match[2], 'base64');
      if (!input.length || input.length > MAX_INPUT_BYTES) {
        return res.status(400).json({ error: 'Размер аватара должен быть до 2 МБ' });
      }

      await fs.mkdir(AVATAR_DIR, { recursive: true });
      const output = await sharp(input)
        .rotate()
        .resize(512, 512, { fit: 'cover' })
        .webp({ quality: 82 })
        .toBuffer();

      const filename = `${safeUserPart(req.userId)}-${Date.now()}.webp`;
      const filepath = path.join(AVATAR_DIR, filename);
      await fs.writeFile(filepath, output);

      const avatarUrl = `/data/avatars/${filename}`;
      const updated = await updateUserAvatar(req.userId, avatarUrl);
      await removePreviousAvatar(currentUser.avatar_url);
      try { await deleteUserCache(req.userId); } catch {}

      return res.status(200).json({ success: true, avatar_url: avatarUrl, user: updated });
    } catch (err) {
      console.error('[upload-avatar] error:', err);
      return res.status(500).json({ error: 'Не удалось сохранить аватар' });
    }
  });
};
