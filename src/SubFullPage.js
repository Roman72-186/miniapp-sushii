// src/SubFullPage.js — Страница подписки тариф 1190 (роллы + сеты)

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { getProductImage } from './config/imageMap';
import './shop.css';

const TABS = [
  { id: 'rolls', name: 'Роллы', icon: '\uD83C\uDF63', jsonUrl: '/подписка 490/rolls-490.json' },
  { id: 'sets', name: 'Сеты', icon: '\uD83C\uDF71', jsonUrl: '/подписка 490/sets-490.json' },
];

function SubFullPage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('rolls');

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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        TABS.map(async (tab) => {
          const res = await fetch(tab.jsonUrl);
          if (!res.ok) throw new Error(`Ошибка загрузки ${tab.name}`);
          const data = await res.json();
          return data.items.map(item => ({
            id: item.sku,
            name: item.name,
            price: 0,
            sku: item.sku,
            category: tab.id,
            image: getProductImage(item.name),
          }));
        })
      );
      setProducts(results.flat());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredProducts = products.filter(p => p.category === activeTab);

  const handleSelect = (product) => {
    const payload = {
      telegram_id: telegramId,
      product_id: product.id,
      product_name: product.name,
      price: 0,
      code: product.sku,
    };
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/order', blob);
      } else {
        fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {}

    window.location.href = `/success?product=${encodeURIComponent(product.name)}`;
  };

  return (
    <div className="shop-page">
      <header className="shop-header">
        <div className="shop-header__center">
          <img src="/logo.jpg" alt="Sushi House" className="shop-header__logo" />
          <span className="shop-header__title">Sushi House</span>
        </div>
        <div className="shop-header__spacer" />
      </header>

      <nav className="shop-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`shop-tabs__item ${activeTab === tab.id ? 'shop-tabs__item--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="shop-tabs__icon">{tab.icon}</span>
            <span className="shop-tabs__name">{tab.name}</span>
          </button>
        ))}
      </nav>

      <div className="shop-section">
        <p style={{ color: '#999', fontSize: 13, margin: '8px 16px', padding: 0 }}>
          Выберите один товар — он входит в вашу подписку
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
          <button className="shop-error__retry" onClick={fetchAll}>Попробовать снова</button>
        </div>
      ) : (
        <div className="shop-grid">
          {filteredProducts.map(product => (
            <SubCard key={product.id} product={product} onSelect={handleSelect} />
          ))}
        </div>
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
