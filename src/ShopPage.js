// src/ShopPage.js — Главная страница магазина /shop

import React, { useState, useMemo, useEffect } from 'react';
import { useMenu, useCart } from './hooks/useFrontpad';
import ShopProductCard from './components/ShopProductCard';
import CartPanel from './components/CartPanel';
import CheckoutForm from './components/CheckoutForm';
import './shop.css';

// Только 3 категории для магазина
const SHOP_CATEGORIES = [
  { id: 'cold-rolls', name: 'Холодные роллы', icon: '🍣' },
  { id: 'hot-rolls', name: 'Запеченные роллы', icon: '🔥' },
  { id: 'sets', name: 'Сеты', icon: '🍱' },
];

function ShopPage() {
  // Тёмный фон на body (перекрывает App.css #f5f5f5)
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const { products, loading, error, refetch } = useMenu();
  const cart = useCart();

  const [activeCategory, setActiveCategory] = useState(null); // null = все
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);

  // Telegram ID
  const telegramId = useMemo(() => {
    const tg = window.Telegram?.WebApp;
    const tgId = tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null;
    if (tgId) return tgId;
    const params = new URLSearchParams(window.location.search);
    return params.get('telegram_id') || null;
  }, []);

  // Фильтруем только 3 нужных категории
  const shopProducts = useMemo(() => {
    const allowedCategories = ['cold-rolls', 'hot-rolls', 'sets'];
    return products.filter(p => allowedCategories.includes(p.category));
  }, [products]);

  // Текущие товары по активной категории
  const filteredProducts = useMemo(() => {
    if (!activeCategory) return shopProducts;
    return shopProducts.filter(p => p.category === activeCategory);
  }, [shopProducts, activeCategory]);

  // Количество товара в корзине
  const getQuantity = (productId) => {
    const item = cart.items.find(i => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  // Обработчики
  const handleCheckout = () => {
    setShowCart(false);
    setShowCheckout(true);
  };

  const handleOrderSuccess = (num) => {
    setShowCheckout(false);
    setOrderNumber(num);
    cart.clear();
  };

  const handleBackToShop = () => {
    setOrderNumber(null);
  };

  // Страница успеха
  if (orderNumber) {
    return (
      <div className="shop-page">
        <div className="shop-success">
          <div className="shop-success__icon">✅</div>
          <h2 className="shop-success__title">Заказ принят!</h2>
          <p className="shop-success__order-num">Номер заказа: {orderNumber}</p>
          <p className="shop-success__text">
            Мы уже готовим ваш заказ. Ожидайте — мы свяжемся с вами для подтверждения.
          </p>
          <button className="shop-success__btn" onClick={handleBackToShop}>
            Вернуться в меню
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-page">
      {/* Хедер */}
      <header className="shop-header">
        <div className="shop-header__left">
          <img src="/logo.jpg" alt="Sushi House" className="shop-header__logo" />
          <span className="shop-header__title">Sushi House</span>
        </div>
        {cart.count > 0 && (
          <button className="shop-header__cart" onClick={() => setShowCart(true)}>
            <span className="shop-header__cart-icon">🛒</span>
            <span>{cart.total}₽</span>
            <span className="shop-header__cart-badge">{cart.count}</span>
          </button>
        )}
      </header>

      {/* Навигация по категориям */}
      <div className="shop-categories">
        <button
          className={`shop-category-btn ${activeCategory === null ? 'shop-category-btn--active' : ''}`}
          onClick={() => setActiveCategory(null)}
        >
          Все
        </button>
        {SHOP_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`shop-category-btn ${activeCategory === cat.id ? 'shop-category-btn--active' : ''}`}
            onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
          >
            <span className="shop-category-icon">{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Контент */}
      {loading ? (
        <div className="shop-loading">
          <div className="shop-loading__spinner" />
          <span className="shop-loading__text">Загрузка меню...</span>
        </div>
      ) : error ? (
        <div className="shop-error">
          <span className="shop-error__text">{error}</span>
          <button className="shop-error__retry" onClick={refetch}>Попробовать снова</button>
        </div>
      ) : activeCategory ? (
        /* Одна категория */
        <div className="shop-grid">
          {filteredProducts.length === 0 ? (
            <div className="shop-empty-category">В этой категории пока нет товаров</div>
          ) : (
            filteredProducts.map(product => (
              <ShopProductCard
                key={product.id}
                product={product}
                quantity={getQuantity(product.id)}
                onAdd={cart.addItem}
                onUpdateQuantity={cart.updateQuantity}
              />
            ))
          )}
        </div>
      ) : (
        /* Все категории с заголовками */
        <div>
          {SHOP_CATEGORIES.map(cat => {
            const catProducts = shopProducts.filter(p => p.category === cat.id);
            if (catProducts.length === 0) return null;
            return (
              <div key={cat.id} className="shop-section">
                <h2 className="shop-section__title">{cat.icon} {cat.name}</h2>
                <div className="shop-grid">
                  {catProducts.map(product => (
                    <ShopProductCard
                      key={product.id}
                      product={product}
                      quantity={getQuantity(product.id)}
                      onAdd={cart.addItem}
                      onUpdateQuantity={cart.updateQuantity}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Корзина */}
      {showCart && (
        <CartPanel
          items={cart.items}
          total={cart.total}
          onUpdateQuantity={cart.updateQuantity}
          onRemove={cart.removeItem}
          onClear={cart.clear}
          onClose={() => setShowCart(false)}
          onCheckout={handleCheckout}
        />
      )}

      {/* Оформление заказа */}
      {showCheckout && (
        <CheckoutForm
          items={cart.items}
          total={cart.total}
          telegramId={telegramId}
          onBack={() => setShowCheckout(false)}
          onSuccess={handleOrderSuccess}
        />
      )}
    </div>
  );
}

export default ShopPage;
