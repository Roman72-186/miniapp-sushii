// src/SubFullPage.js — Страница подписки тариф 1190 (только сеты)

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { getProductImage } from './config/imageMap';
import SubCheckoutModal from './components/SubCheckoutModal';
import './shop.css';

function SubFullPage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderNumber, setOrderNumber] = useState(null);

  const telegramId = useMemo(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try { tg.ready(); } catch {}
      try { tg.expand?.(); } catch {}
    }
    const tgId = tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null;
    if (tgId) return tgId;
    const params = new URLSearchParams(window.location.search);
    return params.get('telegram_id') || null;
  }, []);

  const fetchSets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/подписка 490/sets-490.json');
      if (!res.ok) throw new Error('Ошибка загрузки меню');
      const data = await res.json();
      setProducts(data.items.map(item => ({
        id: item.sku,
        name: item.name,
        price: 0,
        sku: item.sku,
        image: getProductImage(item.name),
      })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSets(); }, [fetchSets]);

  const handleSelect = (product) => {
    setSelectedProduct(product);
  };

  if (orderNumber) {
    return (
      <div className="shop-page">
        <div className="shop-success">
          <div className="shop-success__icon">✅</div>
          <h2 className="shop-success__title">Заказ принят!</h2>
          <p className="shop-success__order-num">Номер заказа: {orderNumber}</p>
          <p className="shop-success__text">Мы уже готовим ваш заказ. Ожидайте!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-page">
      <header className="shop-header">
        <div className="shop-header__center">
          <img src="/logo.jpg" alt="Sushi House" className="shop-header__logo" />
          <span className="shop-header__title">Sushi House</span>
        </div>
        <div className="shop-header__spacer" />
      </header>

      <div className="shop-section">
        <h2 className="shop-section__title">Сеты по подписке</h2>
        <p style={{ color: '#999', fontSize: 13, margin: '4px 16px 0', padding: 0 }}>
          Выберите один сет — он входит в вашу подписку
        </p>
      </div>

      {loading ? (
        <div className="shop-loading">
          <div className="shop-loading__spinner" />
          <span className="shop-loading__text">Загрузка...</span>
        </div>
      ) : error ? (
        <div className="shop-error">
          <span className="shop-error__text">{error}</span>
          <button className="shop-error__retry" onClick={fetchSets}>Попробовать снова</button>
        </div>
      ) : (
        <div className="shop-grid">
          {products.map(product => (
            <SubCard key={product.id} product={product} onSelect={handleSelect} />
          ))}
        </div>
      )}

      {selectedProduct && (
        <SubCheckoutModal
          product={selectedProduct}
          telegramId={telegramId}
          onClose={() => setSelectedProduct(null)}
          onSuccess={(num) => setOrderNumber(num)}
        />
      )}
    </div>
  );
}

function SubCard({ product, onSelect }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="shop-card">
      <div className="shop-card__image-wrap">
        <img
          src={imgError ? '/logo.jpg' : product.image}
          alt={product.name}
          className="shop-card__image"
          onError={() => setImgError(true)}
        />
      </div>
      <div className="shop-card__body">
        <h3 className="shop-card__name">{product.name}</h3>
        <div className="shop-card__bottom">
          <span className="shop-card__price">Подарок</span>
          <button className="shop-card__add-btn" onClick={() => onSelect(product)}>
            Выбрать
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubFullPage;
