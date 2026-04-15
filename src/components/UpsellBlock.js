// src/components/UpsellBlock.js — Блок допродаж в корзине

import React, { useState, useEffect } from 'react';
import { getProductImage } from '../config/imageMap';

function UpsellBlock({ onAddItem, cartSkus }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/api/upsell-items')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          // Фильтруем товары, которых нет в корзине
          const filtered = data.items.filter(p => !cartSkus.includes(String(p.sku)));
          // Показываем максимум 4 товара
          setProducts(filtered.slice(0, 4));
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line

  if (products.length === 0) return null;

  return (
    <div className="upsell-block">
      <p className="upsell-block__title">Добавьте к заказу</p>
      <div className="upsell-block__items">
        {products.map(p => (
          <div key={p.sku} className="upsell-block__item">
            <img
              className="upsell-block__item-img"
              src={getProductImage(p.name) || '/logo.jpg'}
              alt={p.name}
              onError={(e) => { e.target.src = '/logo.jpg'; }}
            />
            <p className="upsell-block__item-name">{p.name}</p>
            <p className="upsell-block__item-price">{p.price}₽</p>
            <button
              className="upsell-block__item-btn"
              onClick={() => onAddItem({
                id: p.sku,
                sku: p.sku,
                name: p.name,
                price: p.price,
                image: getProductImage(p.name)
              })}
            >
              + Добавить
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UpsellBlock;