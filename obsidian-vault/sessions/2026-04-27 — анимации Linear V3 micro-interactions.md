# 2026-04-27 — Анимации Linear V3 micro-interactions

## Что сделано

UX-аудит проекта через `/ui-ux-pro-max` + добавлены недостающие анимации в Linear V3 стиле.

### Анализ

**Было:**
- В `shop.css` — базовые анимации (shop-page-enter, cart slide-in, product-modal-slide-up, fab-in, toast-in)
- В `shop-v2.css` — только `transition: 0.15s ease-out` на hover-состояниях
- В `wordle.css` — богатые flip-анимации
- `prefers-reduced-motion` только в `shop.css` (не покрывал `.pf-*` элементы)

**Выявленные пробелы:**
1. `pf-modal` (тарифы/месяцы профиля) — появлялся мгновенно, без slide-up
2. Счётчик товара (−/число/+) — появлялся мгновенно при первом добавлении
3. FAB badge и header badge — не реагировали на изменение числа
4. Карточки тарифов на лендинге — не было lift on hover
5. Кнопки `pf-quick__btn` — нет press feedback
6. Loading меню — `BrandLoader` (full-page spinner) вместо skeleton cards
7. Секции аккордеона в профиле — мгновенное появление без stagger
8. `prefers-reduced-motion` не покрывал новые элементы

### Реализовано

**`src/shop-v2.css`** — добавлен блок «АНИМАЦИИ» (~130 строк):
- `@keyframes v3-slide-up` — slide-up для pf-modal и edit-profile-modal
- `@keyframes v3-fade-in-up` — для accordion items
- `@keyframes v3-counter-in` — pop-анимация счётчика (easeOutBack)
- `@keyframes v3-badge-bump` — bump для badge при изменении числа (easeOutBack)
- `@keyframes v3-shimmer` — шиммер для skeleton cards
- `.pf-modal` + `.edit-profile-modal__content` — slide-up 0.28s
- `.shop-landing__card` — hover lift translateY(-3px) + border
- `.pf-quick__btn`, `.pf-modal__tariff-btn`, `.pf-modal__month-btn` — press scale(0.95-0.98)
- `.shop-card__counter` — pop при появлении
- `.shop-cart-fab__badge`, `.shop-header__cart-badge` — bump при изменении
- `.shop-skeleton-card` — шиммер-карточка для skeleton grid
- `.pf-accordion__item` — stagger fade-in-up 0.06s delay каждая
- `@media (prefers-reduced-motion: reduce)` — guards для всех новых анимаций

**`src/components/SkeletonGrid.js`** — новый компонент:
- `SkeletonCard` — одна скелетон-карточка с image area + 3 строки текста
- `SkeletonGrid` — сетка из N=6 карточек (2 колонки, как реальная сетка)

**`src/DiscountShopPage.js`**:
- `import SkeletonGrid` — добавлен импорт
- `BrandLoader text="Загружаем меню"` → `SkeletonGrid count={6}` — для основного меню
- `key={cart.count}` на `.shop-cart-fab__badge` — re-render = новая badge-bump анимация
- `key={cart.count}` на `.shop-header__cart-badge` — то же

## Файлы изменены
- `src/shop-v2.css` (+130 строк в конце)
- `src/components/SkeletonGrid.js` (новый)
- `src/DiscountShopPage.js` (импорт + 2 замены)

## Коммит
`feat(ui): Linear V3 micro-animations — slide-up modals, badge bump, skeleton grid, landing lift`

## Сборка
Чистая, без предупреждений. CSS: +1.46 kB gzip.

## Не реализовано (нужен дополнительный рефакторинг)
- **Accordion expand/collapse transition** — нужна JS-контролируемая высота (`max-height` trick) в ProfilePage. Отложено.
- **Skeleton для gift-категорий** — `BrandLoader text="Загружаем подарки"` остался (это отдельный full-screen view, не сетка)
- **Success flash при add-to-cart** — требует local state в ShopProductCard или родителе. Отложено.
- **Страница `/shop`** (ShopPage) — отдельный код, анимации там не добавлялись
