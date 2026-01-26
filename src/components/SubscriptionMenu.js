// src/components/SubscriptionMenu.js — Главный компонент меню с подпиской

import React from 'react';
import { useMenu, useSubscription, useProductFilter } from '../hooks/useFrontpad';
import { CATEGORIES } from '../utils/categories';
import CategoryNav from './CategoryNav';
import SubscriptionProductCard from './SubscriptionProductCard';
import '../styles/subscription.css';

/**
 * Баннер подписки
 */
function SubscriptionBanner({ subscription }) {
  if (!subscription) {
    return (
      <div className="subscription-banner subscription-banner--none">
        <div className="subscription-banner__icon">🎫</div>
        <div className="subscription-banner__content">
          <div className="subscription-banner__title">Нет активной подписки</div>
          <div className="subscription-banner__text">
            Оформите подписку для получения скидок и бонусов
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-banner subscription-banner--active">
      <div className="subscription-banner__icon">✨</div>
      <div className="subscription-banner__content">
        <div className="subscription-banner__title">
          Подписка «{subscription.name}»
        </div>
        <div className="subscription-banner__text">
          {subscription.features.join(' • ')}
        </div>
      </div>
    </div>
  );
}

/**
 * Индикатор загрузки
 */
function LoadingSpinner() {
  return (
    <div className="loading-spinner">
      <div className="loading-spinner__circle"></div>
      <div className="loading-spinner__text">Загрузка меню...</div>
    </div>
  );
}

/**
 * Сообщение об ошибке
 */
function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-message">
      <div className="error-message__icon">⚠️</div>
      <div className="error-message__text">{message}</div>
      {onRetry && (
        <button className="error-message__button" onClick={onRetry}>
          Попробовать снова
        </button>
      )}
    </div>
  );
}

/**
 * Секция категории с товарами
 */
function CategorySection({ category, products, subscription, usedBenefits, onAddToCart }) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="category-section" id={`category-${category.id}`}>
      <h2 className="category-section__title">
        <span className="category-section__icon">{category.icon}</span>
        {category.name}
        <span className="category-section__count">({products.length})</span>
      </h2>
      <div className="category-section__grid">
        {products.map(product => (
          <SubscriptionProductCard
            key={product.id}
            product={product}
            subscription={subscription}
            usedBenefits={usedBenefits}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Главный компонент меню
 */
function SubscriptionMenu({ onAddToCart }) {
  const { products, grouped, loading, error, refetch } = useMenu();
  const { subscription, usedBenefits } = useSubscription();
  const {
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    filtered,
    clearFilters
  } = useProductFilter(products);

  // Если идёт загрузка
  if (loading) {
    return <LoadingSpinner />;
  }

  // Если ошибка
  if (error) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  // Фильтруем grouped по выбранной категории
  const displayProducts = categoryFilter
    ? { [categoryFilter]: filtered }
    : grouped;

  const displayCategories = categoryFilter
    ? CATEGORIES.filter(c => c.id === categoryFilter)
    : CATEGORIES;

  return (
    <div className="subscription-menu">
      {/* Баннер подписки */}
      <SubscriptionBanner subscription={subscription} />

      {/* Поиск */}
      <div className="search-bar">
        <input
          type="text"
          className="search-bar__input"
          placeholder="Поиск по меню..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {(searchQuery || categoryFilter) && (
          <button className="search-bar__clear" onClick={clearFilters}>
            ✕
          </button>
        )}
      </div>

      {/* Навигация по категориям */}
      <CategoryNav
        categories={CATEGORIES}
        activeCategory={categoryFilter}
        onCategorySelect={setCategoryFilter}
        productCounts={Object.fromEntries(
          CATEGORIES.map(c => [c.id, grouped[c.id]?.length || 0])
        )}
      />

      {/* Категории с товарами */}
      <div className="menu-content">
        {searchQuery && filtered.length === 0 ? (
          <div className="no-results">
            <div className="no-results__icon">🔍</div>
            <div className="no-results__text">
              По запросу «{searchQuery}» ничего не найдено
            </div>
            <button className="no-results__button" onClick={clearFilters}>
              Сбросить поиск
            </button>
          </div>
        ) : (
          displayCategories.map(category => (
            <CategorySection
              key={category.id}
              category={category}
              products={searchQuery ? filtered.filter(p => p.category === category.id) : displayProducts[category.id]}
              subscription={subscription}
              usedBenefits={usedBenefits}
              onAddToCart={onAddToCart}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default SubscriptionMenu;
