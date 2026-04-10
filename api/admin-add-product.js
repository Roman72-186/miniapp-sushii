// api/admin-add-product.js — Добавление нового товара в каталоги
const { checkAuth } = require('./_lib/admin-auth');
const { readCatalog, saveCatalog, CATALOGS } = require('./admin-products');
const fs = require('fs');
const path = require('path');

const PRODUCT_IMAGES_DIR = path.join(__dirname, '..', 'data', 'product-images');

// Обычные категории: основной каталог + опционально скидочный
const CATEGORY_MAP = {
  rolls:   { main: 'rolls',   sub: 'rolls-sub'   },
  zaproll: { main: 'zaproll', sub: 'zaproll-sub'  },
  sets:    { main: 'sets',    sub: 'sets-sub'     },
};

// Подарочные категории: напрямую в один каталог, цена всегда 0
const GIFT_CATALOG_MAP = {
  'gift-roll': 'rolls-490',
  'gift-set':  'sets-490',
};

function slugify(name) {
  return name.toLowerCase()
    .replace(/ё/g, 'е').replace(/э/g, 'е')
    .replace(/\s+/g, '-')
    .replace(/[^а-яa-z0-9-]/g, '');
}

function saveImage(imageData, name) {
  const matches = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/s);
  if (!matches) return null;
  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const slug = slugify(name);
  if (!fs.existsSync(PRODUCT_IMAGES_DIR))
    fs.mkdirSync(PRODUCT_IMAGES_DIR, { recursive: true });
  const filename = `${slug}.${ext}`;
  fs.writeFileSync(path.join(PRODUCT_IMAGES_DIR, filename), buffer);
  return `/data/product-images/${filename}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  try {
    const {
      categoryId, name, sku, price, description,
      imageData, addToSub, subSku,
    } = req.body || {};

    if (!categoryId || !name || !sku)
      return res.status(400).json({ error: 'categoryId, name, sku обязательны' });

    const imagePath = imageData ? saveImage(imageData, name) : null;

    // ─── Подарочная категория (gift-roll / gift-set) ───────────
    if (GIFT_CATALOG_MAP[categoryId]) {
      const giftCatalogId = GIFT_CATALOG_MAP[categoryId];
      const giftCatalog = CATALOGS.find(c => c.id === giftCatalogId);
      if (!giftCatalog) return res.status(404).json({ error: 'Подарочный каталог не найден' });

      const giftData = readCatalog(giftCatalog.file);
      if (!giftData) return res.status(404).json({ error: 'Данные каталога не найдены' });

      giftData.items.push({
        name,
        price: 0,
        sku: String(sku),
        ...(description ? { description } : {}),
        ...(imagePath ? { image: imagePath } : {}),
      });
      saveCatalog(giftCatalog.file, giftData);

      return res.status(200).json({ success: true, name, imagePath, catalog: giftCatalogId });
    }

    // ─── Обычная категория (rolls / zaproll / sets) ────────────
    const catMap = CATEGORY_MAP[categoryId];
    if (!catMap) return res.status(400).json({ error: 'Неизвестная категория' });

    if (price === undefined || price === null)
      return res.status(400).json({ error: 'price обязателен для обычных категорий' });

    const mainCatalog = CATALOGS.find(c => c.id === catMap.main);
    if (!mainCatalog) return res.status(404).json({ error: 'Основной каталог не найден' });

    const newItem = {
      name,
      price: Number(price),
      sku: String(sku),
      ...(description ? { description } : {}),
      ...(imagePath ? { image: imagePath } : {}),
    };

    const mainData = readCatalog(mainCatalog.file);
    if (!mainData) return res.status(404).json({ error: 'Данные каталога не найдены' });
    mainData.items.push(newItem);
    saveCatalog(mainCatalog.file, mainData);

    // Добавляем в скидочный каталог
    if (addToSub && catMap.sub && subSku) {
      const subCatalog = CATALOGS.find(c => c.id === catMap.sub);
      if (subCatalog) {
        const subData = readCatalog(subCatalog.file);
        if (subData) {
          subData.items.push({ ...newItem, sku: String(subSku) });
          saveCatalog(subCatalog.file, subData);
        }
      }
    }

    const addedTo = [mainCatalog.name];
    if (addToSub && subSku) addedTo.push('скидочный');

    return res.status(200).json({ success: true, name, imagePath, addedTo });
  } catch (error) {
    console.error('admin-add-product error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
