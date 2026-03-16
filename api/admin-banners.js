// api/admin-banners.js — CRUD баннеров (GET список, POST загрузка, DELETE удаление)
const { checkAuth } = require('./_lib/admin-auth');
const fs = require('fs');
const path = require('path');

const BANNERS_DIR = path.join(__dirname, '..', 'data', 'banners');
const BANNERS_JSON = path.join(__dirname, '..', 'data', 'products', 'banners.json');

function ensureDirs() {
  fs.mkdirSync(BANNERS_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(BANNERS_JSON), { recursive: true });
}

function readBanners() {
  try {
    return JSON.parse(fs.readFileSync(BANNERS_JSON, 'utf8'));
  } catch {
    return [
      { id: 1, image: '/banners/banner-1.jpg' },
      { id: 2, placeholder: true, color: '#f5f5f5' },
      { id: 3, placeholder: true, color: '#eef6f2' },
    ];
  }
}

function writeBanners(banners) {
  ensureDirs();
  fs.writeFileSync(BANNERS_JSON, JSON.stringify(banners, null, 2), 'utf8');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — список баннеров (публичный, без auth)
  if (req.method === 'GET') {
    return res.status(200).json({ success: true, banners: readBanners() });
  }

  // POST/DELETE — требуют auth
  if (!checkAuth(req, res)) return;

  // POST — загрузка баннера или обновление списка
  if (req.method === 'POST') {
    const { slot, imageData, action, banners: newBanners } = req.body || {};

    // Сохранить весь массив баннеров (добавление/удаление слотов)
    if (action === 'set-all' && Array.isArray(newBanners)) {
      writeBanners(newBanners.slice(0, 7));
      return res.status(200).json({ success: true });
    }

    if (!slot || slot < 1 || slot > 7) {
      return res.status(400).json({ error: 'slot должен быть 1-7' });
    }

    if (!imageData) {
      return res.status(400).json({ error: 'imageData обязателен (base64)' });
    }

    try {
      ensureDirs();

      // Декодируем base64
      const matches = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: 'Неверный формат изображения' });
      }

      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const filename = `banner-${slot}.${ext}`;
      const filePath = path.join(BANNERS_DIR, filename);

      fs.writeFileSync(filePath, buffer);

      // Обновляем JSON
      const banners = readBanners();
      const idx = banners.findIndex(b => b.id === Number(slot));
      const entry = { id: Number(slot), image: `/data/banners/${filename}` };

      if (idx >= 0) {
        banners[idx] = entry;
      } else {
        banners.push(entry);
        banners.sort((a, b) => a.id - b.id);
      }

      writeBanners(banners);

      return res.status(200).json({ success: true, banner: entry });
    } catch (error) {
      console.error('admin-banners POST error:', error.message);
      return res.status(500).json({ error: 'Ошибка загрузки' });
    }
  }

  // DELETE — удалить баннер (сделать пустым)
  if (req.method === 'DELETE') {
    const { slot } = req.body || {};

    if (!slot) return res.status(400).json({ error: 'slot обязателен' });

    const banners = readBanners();
    const idx = banners.findIndex(b => b.id === Number(slot));
    const colors = ['#f5f5f5', '#eef6f2', '#f0f0f5'];

    if (idx >= 0) {
      // Удаляем файл если есть
      if (banners[idx].image) {
        const file = path.join(__dirname, '..', banners[idx].image.replace(/^\//, ''));
        try { fs.unlinkSync(file); } catch {}
      }
      banners[idx] = { id: Number(slot), placeholder: true, color: colors[(slot - 1) % colors.length] };
    }

    writeBanners(banners);

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
};
