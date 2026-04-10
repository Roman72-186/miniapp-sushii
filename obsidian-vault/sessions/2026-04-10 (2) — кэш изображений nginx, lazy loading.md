---
date: 2026-04-10
tags: [session, performance, nginx, caching]
---

# 2026-04-10 (2) — HTTP-кэш изображений + lazy loading

## Что сделано

- **nginx**: добавлен Cache-Control `public, max-age=604800` (7 дней) для всех изображений (.jpg/.png/.gif/.webp/.svg/.ico)
- **nginx**: `/data/banners/` исключена через `^~ location` — баннеры по-прежнему `no-cache`
- **ProductCard.js**: добавлен `loading="lazy"` на `<img>` — затрагивает `/rolls`, `/sets`, `/gift-rolls`, `/gift-sets`

## Файлы изменены

| Файл | Изменение |
|------|-----------|
| `nginx/default.conf` | +2 location блока: `^~ /data/banners/` + `~* .(jpg\|png\|...)$` |
| `src/ProductCard.js` | +1 атрибут `loading="lazy"` на строке 71 |

## Коммиты

- `5ff8916` feat: HTTP-кэш 7 дней для изображений в nginx + lazy loading в ProductCard
- `1cbe6b4` fix: proxy_hide_header Cache-Control для изображений в nginx

## Ловушки в этой сессии

### proxy_hide_header нужен при proxy_pass
Express отдаёт `Cache-Control: public, max-age=0` по умолчанию. Nginx `add_header` добавляет второй заголовок — браузер видит оба и берёт строже (`max-age=0`). Решение: `proxy_hide_header Cache-Control` перед `add_header`.

### nginx reload не подхватывает файл после git pull
`git pull` создаёт новый inode, bind mount в Docker всё ещё указывает на старый. `nginx -s reload` читает файл по старому inode — конфиг остаётся прежним. Решение: `docker compose restart nginx`.

### Docker кэширует COPY несмотря на изменения файлов
`docker compose up -d --build` использовал кэшированный слой `COPY . .` даже после git pull. Решение: `docker compose build --no-cache app`.

## Верификация (продакшн)

```
curl -sI https://sushi-house-39.ru/logo.jpg | grep cache-control
→ cache-control: public, max-age=604800 ✅

curl -sI https://sushi-house-39.ru/new_roll/Краб%20дуэт%20гриль.jpg | grep cache-control
→ cache-control: public, max-age=604800 ✅

main.7054a6a0.js содержит "product-img",loading:"lazy" ✅
```
