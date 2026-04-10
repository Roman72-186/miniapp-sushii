---
tags: [debugging, deploy, catalog, override]
date: 2026-04-08
---

# Ловушка: override-файл на VPS перекрывает новые товары

## Симптом
Добавил товар в `public/подписка запеченные/zaproll-sub.json`, задеплоил — товар не появился на сайте.

## Причина
На VPS в Docker-volume (`app-data:/app/data`) хранятся admin-override файлы:
```
/app/data/products/подписка запеченные/zaproll-sub.json
/app/data/products/подписка роллы/rolls-sub.json
... и т.д.
```

Express отдаёт `data/products/` **раньше** чем `build/` (см. server.js). Поэтому браузер получает старый override, а не обновлённый `build/`.

## Как проверить наличие override
```bash
docker exec miniapp-sushii-app-1 ls /app/data/products/
docker exec miniapp-sushii-app-1 ls /app/data/products/подписка\ запеченные/
```

## Варианты фикса

### Вариант 1: добавить товар в override напрямую (быстро, без rebuild)
```bash
docker exec miniapp-sushii-app-1 node -e "
const fs = require('fs');
const path = '/app/data/products/подписка запеченные/zaproll-sub.json';
const d = JSON.parse(fs.readFileSync(path));
d.items.push({name: 'Новый товар', price: 610, sku: '12345'});
fs.writeFileSync(path, JSON.stringify(d, null, 2));
console.log('OK');
"
```

### Вариант 2: удалить override (если там нет важных изменений)
```bash
rm /app/data/products/подписка\ запеченные/zaproll-sub.json
```
После этого `build/` версия начнёт работать.

## Когда возникает override
Admin-панель создаёт override когда:
- Администратор включает/выключает товар через `/admin`
- Администратор меняет цену через `/admin`
Файл сохраняется в `data/products/` и живёт там постоянно.

## Профилактика
При добавлении нового товара всегда проверять:
1. Есть ли override для этого каталога на VPS?
2. Если да — добавить товар и туда.
