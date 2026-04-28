import React from 'react';

function ShopProductCard({ product, quantity, onAdd, onUpdateQuantity, onImageClick }) {
  return (
    <div className="shop-card">
      <div
        className="shop-card__image-wrap"
        onClick={() => onImageClick && onImageClick(product)}
        style={onImageClick ? { cursor: 'pointer' } : undefined}
      >
        <img
          className="shop-card__image"
          src={product.image || '/logo.jpg'}
          alt={product.cleanName || product.name}
          loading="lazy"
        />
        <div className="shop-card__action-overlay" onClick={e => e.stopPropagation()}>
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
      <div className="shop-card__body">
        <h3 className="shop-card__name">{product.cleanName || product.name}</h3>
        {product.description && (
          <p className="shop-card__desc">{product.description}</p>
        )}
        {product.weight && (
          <p className="shop-card__weight">{product.weight}</p>
        )}
        <div className="shop-card__prices">
          {product.oldPrice ? (
            <>
              <span className="shop-card__old-price">{product.oldPrice}₽</span>
              <span className="shop-card__savings">Выгода {product.savings}₽</span>
              <span className="shop-card__price">{product.price}₽</span>
            </>
          ) : (
            <span className="shop-card__price">{product.price}₽</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShopProductCard;
