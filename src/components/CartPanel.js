// src/components/CartPanel.js — Выдвижная панель корзины (тёмная тема)

import React, { useEffect } from 'react';
import UpsellBlock from './UpsellBlock';

function CartPanel({ items, total, onUpdateQuantity, onRemove, onClear, onClose, onCheckout, onAddItem }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      <div className="shop-cart-overlay" onClick={onClose} />
      <div className="shop-cart">
        <div className="shop-cart__header">
          <h2 className="shop-cart__title">Вы добавили</h2>
          <button className="shop-cart__close" onClick={onClose}>&times;</button>
        </div>

        {items.length === 0 ? (
          <div className="shop-cart__empty">
            <span className="shop-cart__empty-icon">🛒</span>
            <span>Корзина пуста</span>
          </div>
        ) : (
          <>
            <div className="shop-cart__items">
              {items.map(item => (
                <div key={item.product.id} className={`shop-cart__item${item.product.gift ? ' shop-cart__item--gift' : ''}`}>
                  <img
                    className="shop-cart__item-img"
                    src={item.product.image || '/logo.jpg'}
                    alt={item.product.cleanName || item.product.name}
                  />
                  <div className="shop-cart__item-info">
                    <p className="shop-cart__item-name">{item.product.cleanName || item.product.name}</p>
                    {item.product.gift ? (
                      <p className="shop-cart__item-price shop-cart__item-price--gift">🎁 Подарок по подписке</p>
                    ) : (
                      <p className="shop-cart__item-price">{item.product.price}₽ / шт</p>
                    )}
                  </div>
                  <button
                    className="shop-cart__item-remove"
                    onClick={() => onRemove(item.product.id)}
                    aria-label="Удалить из корзины"
                  >
                    &times;
                  </button>
                  {item.product.gift ? (
                    <span className="shop-cart__item-gift-free">Бесплатно</span>
                  ) : (
                    <>
                      <div className="shop-cart__item-controls">
                        <button
                          className="shop-cart__item-btn"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="shop-cart__item-qty">{item.quantity}</span>
                        <button
                          className="shop-cart__item-btn"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <span className="shop-cart__item-total">{item.product.price * item.quantity}₽</span>
                    </>
                  )}
                </div>
              ))}
              <button className="shop-cart__clear" onClick={onClear}>
                Очистить корзину
              </button>
            </div>

            {items.length > 0 && onAddItem && (
              <UpsellBlock
                onAddItem={onAddItem}
                cartSkus={items.map(i => i.product.sku || i.product.id)}
              />
            )}

            <div className="shop-cart__footer">
              <div className="shop-cart__total-row">
                <span className="shop-cart__total-label">Сумма заказа:</span>
                <span className="shop-cart__total-value">{total}₽</span>
              </div>
              <button className="shop-cart__checkout-btn" onClick={onCheckout}>
                Оформить заказ
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default CartPanel;
