// src/components/CategoryNav.js — Горизонтальная навигация по категориям

import React, { useRef, useEffect } from 'react';

/**
 * Компонент навигации по категориям
 * @param {Array} categories - Массив категорий
 * @param {string|null} activeCategory - ID активной категории (null = все)
 * @param {Function} onCategorySelect - Обработчик выбора категории
 * @param {Object} productCounts - Количество товаров в каждой категории { categoryId: count }
 */
function CategoryNav({ categories, activeCategory, onCategorySelect, productCounts = {} }) {
  const navRef = useRef(null);
  const activeRef = useRef(null);

  // Прокрутка к активной категории
  useEffect(() => {
    if (activeRef.current && navRef.current) {
      const nav = navRef.current;
      const active = activeRef.current;
      const navRect = nav.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();

      // Центрируем активный элемент
      const scrollLeft = active.offsetLeft - (navRect.width / 2) + (activeRect.width / 2);
      nav.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeCategory]);

  const handleClick = (categoryId) => {
    // Если кликнули на активную категорию — сбрасываем фильтр
    if (categoryId === activeCategory) {
      onCategorySelect(null);
    } else {
      onCategorySelect(categoryId);
    }
  };

  const handleScrollToCategory = (categoryId) => {
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="category-nav" ref={navRef}>
      {/* Кнопка "Все" */}
      <button
        className={`category-nav__item ${activeCategory === null ? 'category-nav__item--active' : ''}`}
        onClick={() => onCategorySelect(null)}
        ref={activeCategory === null ? activeRef : null}
      >
        <span className="category-nav__icon">📋</span>
        <span className="category-nav__name">Все</span>
      </button>

      {/* Категории */}
      {categories.map(category => {
        const count = productCounts[category.id] || 0;
        const isActive = activeCategory === category.id;

        // Пропускаем пустые категории
        if (count === 0) return null;

        return (
          <button
            key={category.id}
            className={`category-nav__item ${isActive ? 'category-nav__item--active' : ''}`}
            onClick={() => handleClick(category.id)}
            onDoubleClick={() => handleScrollToCategory(category.id)}
            ref={isActive ? activeRef : null}
          >
            <span className="category-nav__icon">{category.icon}</span>
            <span className="category-nav__name">{category.name}</span>
            {count > 0 && (
              <span className="category-nav__count">{count}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export default CategoryNav;
