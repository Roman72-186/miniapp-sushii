// api/admin-products.js — Управление товарами (чтение/редактирование JSON каталогов)
const { checkAuth } = require('./_lib/admin-auth');
const fs = require('fs');
const path = require('path');

// Каталоги товаров
const CATALOGS = [
  { id: 'rolls', name: 'Холодные роллы', file: 'холодные роллы/rolls.json' },
  { id: 'zaproll', name: 'Запечённые роллы', file: 'запеченные роллы/zaproll.json' },
  { id: 'sets', name: 'Сеты', file: 'сеты/set.json' },
  { id: 'rolls-sub', name: 'Роллы (подписка -30%)', file: 'подписка роллы/rolls-sub.json' },
  { id: 'zaproll-sub', name: 'Запечённые (подписка -30%)', file: 'подписка запеченные/zaproll-sub.json' },
  { id: 'sets-sub', name: 'Сеты (подписка -20%)', file: 'подписка сеты/sets-sub.json' },
  { id: 'rolls-490', name: 'Подарочные роллы (490)', file: 'подписка 490/rolls-490.json' },
  { id: 'sets-490', name: 'Подарочные сеты (1190)', file: 'подписка 490/sets-490.json' },
];

const BUILD_DIR = path.join(__dirname, '..', 'build');
const DATA_DIR = path.join(__dirname, '..', 'data', 'products');

/**
 * Читает JSON каталог: сначала из data/products/ (админские правки),
 * потом fallback на build/ (оригинал)
 */
function readCatalog(filePath) {
  const dataPath = path.join(DATA_DIR, filePath);
  const buildPath = path.join(BUILD_DIR, filePath);

  if (fs.existsSync(dataPath)) {
    return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  }
  if (fs.existsSync(buildPath)) {
    return JSON.parse(fs.readFileSync(buildPath, 'utf-8'));
  }
  return null;
}

/**
 * Сохраняет каталог в data/products/ (persistent volume)
 */
function saveCatalog(filePath, data) {
  const dataPath = path.join(DATA_DIR, filePath);
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  try {
    // GET — список всех каталогов с товарами
    if (req.method === 'GET') {
      const result = [];
      for (const cat of CATALOGS) {
        const data = readCatalog(cat.file);
        if (data) {
          result.push({
            id: cat.id,
            name: cat.name,
            file: cat.file,
            category: data.category || cat.name,
            itemCount: (data.items || []).length,
            items: (data.items || []).map((item, idx) => ({
              index: idx,
              name: item.name,
              price: item.price,
              sku: item.sku || '',
              enabled: item.enabled !== false, // по умолчанию включён
            })),
          });
        }
      }
      return res.status(200).json({ success: true, catalogs: result });
    }

    // PUT — обновление товара
    if (req.method === 'PUT') {
      const { catalogId, itemIndex, price, enabled } = req.body || {};

      if (!catalogId) return res.status(400).json({ error: 'catalogId обязателен' });
      if (itemIndex === undefined || itemIndex === null) {
        return res.status(400).json({ error: 'itemIndex обязателен' });
      }

      const catalog = CATALOGS.find(c => c.id === catalogId);
      if (!catalog) return res.status(404).json({ error: 'Каталог не найден' });

      const data = readCatalog(catalog.file);
      if (!data || !data.items) return res.status(404).json({ error: 'Данные каталога не найдены' });

      const idx = Number(itemIndex);
      if (idx < 0 || idx >= data.items.length) {
        return res.status(400).json({ error: 'Некорректный itemIndex' });
      }

      // Обновляем поля
      if (price !== undefined && price !== null) {
        data.items[idx].price = Number(price);
      }
      if (enabled !== undefined && enabled !== null) {
        data.items[idx].enabled = Boolean(enabled);
      }

      saveCatalog(catalog.file, data);

      return res.status(200).json({
        success: true,
        item: {
          index: idx,
          name: data.items[idx].name,
          price: data.items[idx].price,
          enabled: data.items[idx].enabled !== false,
        },
      });
    }

    return res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (error) {
    console.error('admin-products error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
