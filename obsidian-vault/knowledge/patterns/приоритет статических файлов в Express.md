---
tags: [pattern, express, static-files]
date: 2026-04-07
---

# Приоритет статических файлов в Express

Express отдаёт первый найденный файл. Порядок в `server.js`:

```
1. data/banners/      →  /data/banners/*
2. data/products/     →  /*  (любой путь!)
3. public/admin/      →  /admin/*
4. build/             →  /* (React build)
```

## Что это означает на практике

### `data/products/` переопределяет `build/`

Когда администратор меняет цену или включает/выключает товар, файл сохраняется в `data/products/`. При следующем запросе `/rolls.json` Express найдёт его **раньше** чем файл в `build/`.

> ⚠️ **Ловушка:** если обновить цену в `public/холодные роллы/rolls.json` и задеплоить — она НЕ применится, пока в `data/products/` лежит старый файл. Нужно удалить оверрайд на VPS:
> ```bash
> rm /app/data/products/rolls.json
> ```

### `public/admin/` — статические HTML-страницы

Папка `public/admin/` раздаётся по пути `/admin` **до** React build. Это значит `/admin` открывает статическую HTML-страницу, а не React-компонент `AdminPage`.

Вход в React-AdminPage происходит через тройной клик на логотип → редирект на `/admin` (React).

### Подписки на цены

Цены тарифов хранятся в `data/products/pricing.json`.
Если файл отсутствует → `DEFAULT_PRICING` из `api/admin-pricing.js`.
Обновляется через: `PUT /api/admin/pricing`

## JSON и HTML без кэша

Все `.json` и `.html` файлы отдаются с заголовками:
```
Cache-Control: no-cache, no-store, must-revalidate
```

Это нужно чтобы изменения в каталоге и настройках сразу подхватывались.

## Связанные заметки
- [[архитектура приложения]]
- [[каталог товаров — текущее состояние]]
- [[деплой и инфраструктура]]
