// src/components/CartPanel.js — Выдвижная панель корзины (тёмная тема)

import React, { useEffect, useMemo, useRef } from 'react';
import UpsellBlock from './UpsellBlock';
import OptimizedImage from './OptimizedImage';
import { describeGiftSource } from '../utils/cartGifts';
import { reachGoal, YM_GOALS } from '../analytics/metrika';

function CartPanel({ items, total, onUpdateQuantity, onRemove, onClear, onClose, onCheckout, onAddItem, promoCode, onPromoCodeChange, promoMessages, isPromoValid }) {
  const trackedPromoRef = useRef('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    reachGoal(YM_GOALS.CART_OPEN, {
      value: Number(total) || 0,
      items_count: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    });
    return () => { document.body.style.overflow = ''; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const code = String(promoCode || '').trim().toUpperCase();
    if (!code || !isPromoValid || trackedPromoRef.current === code) return;
    trackedPromoRef.current = code;
    reachGoal(YM_GOALS.PROMO_APPLY_SUCCESS, { promo_type: 'public' });
  }, [promoCode, isPromoValid]);

  const cartSkus = useMemo(
    () => items.map(i => i.product.sku || i.product.id),
    [items]
  );

  return (
    <>
      <div className="shop-cart-overlay" onClick={onClose} />
      <div className="shop-cart" role="dialog" aria-modal="true" aria-label="Корзина">
        <div className="shop-cart__header">
          <h2 className="shop-cart__title">Вы добавили</h2>
          <button
            type="button"
            className="shop-cart__close"
            onClick={onClose}
            aria-label="Закрыть корзину"
          >
            &times;
          </button>
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
                  <OptimizedImage
                    className="shop-cart__item-img"
                    src={item.product.image || '/logo.jpg'}
                    alt={item.product.cleanName || item.product.name}
                    loading="lazy"
                    width={160}
                    widths={[96, 160, 240]}
                    sizes="72px"
                  />
                  <div className="shop-cart__item-info">
                    <p className="shop-cart__item-name">{item.product.cleanName || item.product.name}</p>
                    {item.product.gift ? (
                      <p className="shop-cart__item-price shop-cart__item-price--gift">
                        🎁 {describeGiftSource(item.giftSource, item.product)}
                      </p>
                    ) : (
                      <p className="shop-cart__item-price">{item.product.price}₽ / шт</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="shop-cart__item-remove"
                    onClick={() => onRemove(item.product.id)}
                    aria-label={`Удалить из корзины: ${item.product.cleanName || item.product.name}`}
                  >
                    &times;
                  </button>
                  {item.product.gift ? (
                    <span className="shop-cart__item-gift-free">Бесплатно</span>
                  ) : (
                    <>
                      <div className="shop-cart__item-controls">
                        <button
                          type="button"
                          className="shop-cart__item-btn"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                          aria-label="Уменьшить количество"
                        >
                          −
                        </button>
                        <span className="shop-cart__item-qty" aria-live="polite">{item.quantity}</span>
                        <button
                          type="button"
                          className="shop-cart__item-btn"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          aria-label="Увеличить количество"
                        >
                          +
                        </button>
                      </div>
                      <span className="shop-cart__item-total">{item.product.price * item.quantity}₽</span>
                    </>
                  )}
                </div>
              ))}
              <button type="button" className="shop-cart__clear" onClick={onClear}>
                Очистить корзину
              </button>
            </div>

            {items.length > 0 && onAddItem && (
              <UpsellBlock
                onAddItem={onAddItem}
                cartSkus={cartSkus}
              />
            )}

            {onPromoCodeChange && (
              <div className="shop-cart__promo">
                <label className="shop-cart__promo-label" htmlFor="cart-promo">Промокод</label>
                <div className="shop-cart__promo-row">
                  <input
                    id="cart-promo"
                    type="text"
                    className="shop-cart__promo-input"
                    placeholder="Промокод"
                    value={promoCode || ''}
                    onChange={e => onPromoCodeChange(e.target.value.trim())}
                    maxLength={30}
                    autoComplete="off"
                    aria-describedby={promoCode ? 'cart-promo-status' : undefined}
                    aria-invalid={promoCode ? !isPromoValid : undefined}
                  />
                  {promoCode && (
                    <button
                      type="button"
                      className="shop-cart__promo-clear"
                      onClick={() => onPromoCodeChange('')}
                      aria-label="Очистить промокод"
                    >
                      &times;
                    </button>
                  )}
                  {promoCode && (
                    <span
                      id="cart-promo-status"
                      className={`shop-cart__promo-status ${isPromoValid ? 'shop-cart__promo-status--ok' : 'shop-cart__promo-status--err'}`}
                      aria-label={isPromoValid ? 'Промокод применён' : 'Промокод не действует'}
                    >
                      {isPromoValid ? '✓' : '✗'}
                    </span>
                  )}
                </div>
                <div className="shop-cart__promo-msgs" aria-live="polite">
                  {promoMessages && promoMessages.map((msg, i) => (
                    <p key={i} className={`shop-cart__promo-msg shop-cart__promo-msg--${msg.type}`}>
                      {msg.text}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="shop-cart__footer">
              <div className="shop-cart__total-row">
                <span className="shop-cart__total-label">Сумма заказа:</span>
                <span className="shop-cart__total-value">{total}₽</span>
              </div>
              <button
                type="button"
                className="shop-cart__checkout-btn"
                onClick={() => {
                  reachGoal(YM_GOALS.CHECKOUT_START, {
                    value: Number(total) || 0,
                    items_count: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
                  });
                  onCheckout();
                }}
              >
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
