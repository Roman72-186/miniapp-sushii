// src/components/SubscriptionProductCard.js — Карточка товара с учётом подписки

import React, { useState } from 'react';
import { useProductPrice } from '../hooks/useFrontpad';
import { DEFAULT_IMAGE } from '../config/imageMap';

/**
 * Форматирует цену
 * @param {number} price - Цена
 * @returns {string} - Форматированная цена
 */
function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(price);
}

/**
 * Компонент карточки товара
 * @param {Object} product - Товар
 * @param {Object} subscription - Подписка пользователя
 * @param {Object} usedBenefits - Использованные бонусы подписки
 * @param {Function} onAddToCart - Обработчик добавления в корзину
 */
function SubscriptionProductCard({ product, subscription, usedBenefits, onAddToCart }) {
  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const {
    isFree,
    freeReason,
    originalPrice,
    finalPrice,
    discountPercent,
  } = useProductPrice(product, subscription, usedBenefits);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleAddToCart = async () => {
    if (isAdding) return;

    setIsAdding(true);

    // Анимация добавления
    await new Promise(resolve => setTimeout(resolve, 300));

    if (onAddToCart) {
      onAddToCart(product);
    }

    setIsAdding(false);
  };

  const imageSrc = imageError ? DEFAULT_IMAGE : (product.image || DEFAULT_IMAGE);

  return (
    <div className={`product-card ${isFree ? 'product-card--free' : ''} ${isAdding ? 'product-card--adding' : ''}`}>
      {/* Бейдж бесплатного товара */}
      {isFree && (
        <div className="product-card__badge product-card__badge--free">
          Бесплатно
        </div>
      )}

      {/* Бейдж скидки */}
      {!isFree && discountPercent > 0 && (
        <div className="product-card__badge product-card__badge--discount">
          -{discountPercent}%
        </div>
      )}

      {/* Изображение */}
      <div className="product-card__image-wrapper">
        <img
          src={imageSrc}
          alt={product.cleanName || product.name}
          className="product-card__image"
          onError={handleImageError}
          loading="lazy"
        />
      </div>

      {/* Информация о товаре */}
      <div className="product-card__info">
        <h3 className="product-card__name">
          {product.cleanName || product.name}
        </h3>

        {/* Причина бесплатного товара */}
        {isFree && freeReason && (
          <div className="product-card__free-reason">
            {freeReason}
          </div>
        )}

        {/* Цена */}
        <div className="product-card__price-row">
          {isFree ? (
            <>
              <span className="product-card__price product-card__price--free">
                0 ₽
              </span>
              <span className="product-card__price product-card__price--original">
                {formatPrice(originalPrice)} ₽
              </span>
            </>
          ) : discountPercent > 0 ? (
            <>
              <span className="product-card__price">
                {formatPrice(finalPrice)} ₽
              </span>
              <span className="product-card__price product-card__price--original">
                {formatPrice(originalPrice)} ₽
              </span>
            </>
          ) : (
            <span className="product-card__price">
              {formatPrice(originalPrice)} ₽
            </span>
          )}
        </div>
      </div>

      {/* Кнопка добавления */}
      <button
        className="product-card__add-button"
        onClick={handleAddToCart}
        disabled={isAdding}
      >
        {isAdding ? (
          <span className="product-card__add-spinner"></span>
        ) : (
          <>
            <span className="product-card__add-icon">+</span>
            <span className="product-card__add-text">В корзину</span>
          </>
        )}
      </button>
    </div>
  );
}

export default SubscriptionProductCard;
