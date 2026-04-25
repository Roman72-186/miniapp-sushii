---
tags: [session, design, css, linear]
date: 2026-04-25
duration: 1h
status: success
---

# Linear-style редизайн веб-приложения

## Задача
Реализовать Linear-style редизайн веб-приложения суши-ресторана:
- Фон: #0F0F11 (почти чёрный)
- Карточки: flat с 1px border rgba(255,255,255,0.07), БЕЗ теней
- Шрифт: Manrope (Google Fonts)
- Акцент: #3CC8A1 (сохраняется)
- Анимации: 150ms ease-out
- Табы: underline вместо pill/neomorphism

## Выполнено

### Фаза 1: Шрифт Manrope
- ✅ Добавил Google Fonts link в `public/index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  ```

### Фаза 2: App.css — базовая палитра
- ✅ Обновил `src/App.css`:
  - CSS-переменные `:root` с Linear-палитрой
  - `body { font-family: 'Manrope', ... }`
  - Фон: `#0F0F11`
  - Цвет текста: `#E8E8E8`
  - `-webkit-font-smoothing: antialiased`

### Фаза 3: shop-v2.css — полная переписка (830 строк)
- ✅ Новая структура файла:
  - **Блок A**: Linear V3 design tokens (--v3-*)
  - **Блок B**: Neomorphism kill switch (box-shadow: none !important)
  - Все компоненты переписаны в Linear-стиле

#### Ключевые изменения стилистики:

**Header**:
- Backdrop-filter blur
- Flat кнопки с `border: 1px solid var(--v3-border)`
- Hover: `border-color: var(--v3-border-strong)`, `background: #28282E`

**Табы — underline**:
- `background: transparent`
- `border-bottom: 2px solid transparent`
- Active: `border-bottom-color: var(--v3-accent)`
- Убран неоморфный стиль, добавлен современный underline

**Карточки товаров — flat**:
- `background: var(--v3-surface)` (#18181B)
- `border: 1px solid var(--v3-border)`
- Hover: `border-color: var(--v3-border-strong)`, `background: #1C1C20`
- Полностью убраны box-shadow

**Кнопки**:
- Акцентные: `background: var(--v3-accent)`, `color: #0A0A0A`
- Вторичные: `background: var(--v3-raise)`, `border: 1px solid var(--v3-border)`
- Hover: изменение opacity/background, никаких теней

**Формы**:
- Инпуты: `background: var(--v3-inset)`, `border: 1px solid var(--v3-border)`
- Focus: `border-color: var(--v3-accent-border)`
- Placeholder: `color: var(--v3-dim)`

**Корзина**:
- Flat дизайн с границами
- Промокод поле в том же стиле
- Удаление теней для всех элементов

### Критичные решения:
1. **Сохранена вся структура** — display, flex, grid, padding, position не изменились
2. **Акцент #3CC8A1 сохранён** — по требованию ТЗ
3. **150ms ease-out** — глобально применено через селектор в конце файла
4. **Manrope** — используется везде через font-family
5. **Kill-switch** — убраны все neomorphic box-shadow через !important

## Технические детали

### Файлы изменены:
- `public/index.html` — Google Fonts link
- `src/App.css` — базовая палитра + Manrope
- `src/shop-v2.css` — полностью переписан (830 строк)

### CSS-токены Linear V3:
```css
--v3-bg:            #0F0F11;  /* фон приложения */
--v3-surface:       #18181B;  /* карточки */
--v3-raise:         #1F1F23;  /* поднятые элементы */
--v3-inset:         #141416;  /* вдавленные элементы */
--v3-border:        rgba(255, 255, 255, 0.07);  /* границы */
--v3-border-strong: rgba(255, 255, 255, 0.14);  /* hover */
--v3-accent:        #3CC8A1;  /* акцентный цвет */
--v3-text:          #E8E8E8;  /* основной текст */
--v3-muted:         #71717A;  /* приглушённый */
```

## Проверка
- ✅ `npm run build` — проект собирается без ошибок CSS
- ✅ Только ESLint warnings о неиспользуемых переменных (не критично)
- ✅ Size: main.css +951B (17.6 kB total) — разумное увеличение

## Результат
Linear-style редизайн полностью реализован:
- Убран весь неоморфизм (мягкие тени, вдавленные элементы)
- Добавлены flat карточки с тонкими границами
- Современные underline табы вместо pill
- Шрифт Manrope с правильными весами
- Плавные анимации 150ms ease-out
- Палитра Linear (#0F0F11 bg + #3CC8A1 accent)

Проект готов к тестированию в браузере. Все функциональные флоу должны работать как раньше — изменён только визуальный стиль.