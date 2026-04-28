# 2026-04-28 (2) — Редизайн карточки товара: hover-zoom + overlay кнопка + aspect-square

## Что сделано

Адаптирован референс `card_user.tsx` в текущий JS/CSS стек проекта. Три улучшения:

1. **Hover-zoom** — картинка плавно увеличивается при наведении (scale 1.0 → 1.08 за 0.3s), исчезает при убирании курсора.
2. **Overlay кнопка «Добавить»** — кнопка и счётчик перенесены поверх картинки (абсолютно позиционированный div с градиентным фоном), появляется при hover. На touch-устройствах (`hover: none`) всегда видна.
3. **Квадратное изображение** — `aspect-ratio: 1/1` (было 16/10).

## Изменённые файлы

### `src/components/ShopProductCard.js`
- Добавлен `<div className="shop-card__action-overlay">` внутрь `shop-card__image-wrap` — содержит кнопку «Добавить» / счётчик
- `onClick={e => e.stopPropagation()}` на overlay — чтобы не открывать детали товара при клике на кнопку
- Убран `<div className="shop-card__bottom">` (больше не нужен как flex-контейнер кнопки+цены)
- Цены (`shop-card__prices`) теперь напрямую в `shop-card__body`

### `src/shop-v2.css`
- `.shop-page .shop-card__image-wrap` → добавлены `position: relative`, `overflow: hidden`, `aspect-ratio: 1/1`
- Заменён `transition: none !important` на `transform: scale(1.0); transition: transform 0.3s ease-out !important`
- Добавлен `.shop-card:hover .shop-card__image { transform: scale(1.08) }`
- Добавлен `@media (prefers-reduced-motion: reduce)` guard
- Добавлен `.shop-card__action-overlay` — overlay с gradient + `opacity: 0 → 1` при hover
- Добавлен `@media (hover: none)` — overlay всегда виден на мобиле
- `.shop-card__prices` — добавлен `margin-top: auto` (раньше был на `shop-card__bottom`)

## Коммит

`feat(ui): hover-zoom карточки + overlay кнопка + aspect-square изображение`  
Хэш: `14b87d8`

## Деплой

VPS 64.188.63.249 — `Up`, контейнер перезапущен.
