// api/admin-add-product.js — Добавление нового товара в каталоги
const { checkAuth } = require('./_lib/admin-auth');
const { readCatalog, saveCatalog, CATALOGS } = require('./admin-products');
const fs = require('fs');
const path = require('path');

const PRODUCT_IMAGES_DIR = path.join(__dirname, '..', 'data', 'product-images');

// Маппинг категории на файлы связанных каталогов
const CATEGORY_MAP = {
  rolls:   { sub: 'rolls-sub',   sub490: 'rolls-490' },
  zaproll: { sub: 'zaproll-sub', sub490: null },
  sets:    { sub: 'sets-sub',    sub490: 'sets-490'  },
};

function slugify(name) {
  return name.toLowerCase()
    .replace(/ё/g, 'е').replace(/э/g, 'е')
    .replace(/\s+/g, '-')
    .replace(/[^а-яa-z0-9-]/g, '');
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
      imageData, addToSub, subSku, addTo490, sku490,
    } = req.body || {};

    if (!categoryId || !name || !sku || price === undefined || price === null)
      return res.status(400).json({ error: 'categoryId, name, sku, price обязательны' });

    const catMap = CATEGORY_MAP[categoryId];
    if (!catMap) return res.status(400).json({ error: 'Неизвестная категория' });

    const mainCatalog = CATALOGS.find(c => c.id === categoryId);
    if (!mainCatalog) return res.status(404).json({ error: 'Каталог не найден' });

    // Сохраняем фото
    let imagePath = null;
    if (imageData) {
      const matches = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/s);
      if (matches) {
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const slug = slugify(name);
        if (!fs.existsSync(PRODUCT_IMAGES_DIR))
          fs.mkdirSync(PRODUCT_IMAGES_DIR, { recursive: true });
        const filename = `${slug}.${ext}`;
        fs.writeFileSync(path.join(PRODUCT_IMAGES_DIR, filename), buffer);
        imagePath = `/data/product-images/${filename}`;
      }
    }

    const newItem = {
      name,
      price: Number(price),
      sku: String(sku),
      ...(description ? { description } : {}),
      ...(imagePath ? { image: imagePath } : {}),
    };

    // Добавляем в основной каталог
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

    // Добавляем в подарочный каталог 490
    if (addTo490 && catMap.sub490 && sku490) {
      const sub490Catalog = CATALOGS.find(c => c.id === catMap.sub490);
      if (sub490Catalog) {
        const sub490Data = readCatalog(sub490Catalog.file);
        if (sub490Data) {
          sub490Data.items.push({ ...newItem, sku: String(sku490), price: 0 });
          saveCatalog(sub490Catalog.file, sub490Data);
        }
      }
    }

    return res.status(200).json({ success: true, name, imagePath });
  } catch (error) {
    console.error('admin-add-product error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
