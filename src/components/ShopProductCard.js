// src/components/ShopProductCard.js — Карточка товара для магазина (тёмная тема)

import React from 'react';

function ShopProductCard({ product, quantity, onAdd, onUpdateQuantity }) {
  return (
    <div className="shop-card">
      <div className="shop-card__image-wrap">
        <img
          className="shop-card__image"
          src={product.image || '/logo.jpg'}
          alt={product.cleanName || product.name}
          loading="lazy"
        />
      </div>
      <div className="shop-card__body">
        <h3 className="shop-card__name">{product.cleanName || product.name}</h3>
        {product.description && (
          <p className="shop-card__desc">{product.description}</p>
        )}
        {product.weight && (
          <p className="shop-card__weight">{product.weight}</p>
        )}
        <div className="shop-card__bottom">
          <span className="shop-card__price">{product.price}₽</span>
          {quantity > 0 ? (
            <div className="shop-card__counter">
              <button
                className="shop-card__counter-btn"
                onClick={() => onUpdateQuantity(product.id, quantity - 1)}
              >
                −
              </button>
              <span className="shop-card__counter-val">{quantity}</span>
              <button
                className="shop-card__counter-btn"
                onClick={() => onUpdateQuantity(product.id, quantity + 1)}
              >
                +
              </button>
            </div>
          ) : (
            <button className="shop-card__add-btn" onClick={() => onAdd(product)}>
              Добавить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShopProductCard;
