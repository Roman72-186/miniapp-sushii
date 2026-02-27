// src/ShopPage.js — Главная страница магазина /shop

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCart } from './hooks/useFrontpad';
import { getProductImage } from './config/imageMap';
import ShopProductCard from './components/ShopProductCard';
import CartPanel from './components/CartPanel';
import CheckoutForm from './components/CheckoutForm';
import './shop.css';

// 3 категории с путями к JSON
const SHOP_CATEGORIES = [
  { id: 'cold-rolls', name: 'Холодные роллы', icon: '🍣', jsonUrl: '/холодные роллы/rolls.json' },
  { id: 'hot-rolls', name: 'Запеченные роллы', icon: '🔥', jsonUrl: '/запеченные роллы/zaproll.json' },
  { id: 'sets', name: 'Сеты', icon: '🍱', jsonUrl: '/сеты/set.json' },
];

function useLocalMenu() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        SHOP_CATEGORIES.map(async (cat) => {
          const res = await fetch(cat.jsonUrl);
          if (!res.ok) throw new Error(`Ошибка загрузки ${cat.name}`);
          const data = await res.json();
          return data.items.map((item, idx) => ({
            id: item.sku || `${cat.id}-${idx}`,
            name: item.name,
            cleanName: item.name,
            price: item.price,
            category: cat.id,
            image: getProductImage(item.name),
          }));
        })
      );
      setProducts(results.flat());
    } catch (err) {
      setError(err.message || 'Не удалось загрузить меню');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { products, loading, error, refetch: fetchAll };
}

function ShopPage() {
  // Тёмный фон на body
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const { products, loading, error, refetch } = useLocalMenu();
  const cart = useCart();

  const [activeCategory, setActiveCategory] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
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

  // Товары по активной категории
  const filteredProducts = useMemo(() => {
    if (!activeCategory) return products;
    return products.filter(p => p.category === activeCategory);
  }, [products, activeCategory]);

  // Количество товара в корзине
  const getQuantity = (productId) => {
    const item = cart.items.find(i => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const handleCheckout = () => {
    setShowCart(false);
    setShowCheckout(true);
  };

  const handleOrderSuccess = (num) => {
    setShowCheckout(false);
    setOrderNumber(num);
    cart.clear();
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
          <button className="shop-success__btn" onClick={() => setOrderNumber(null)}>
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
        <button
          className={`shop-header__burger ${showMenu ? 'shop-header__burger--open' : ''}`}
          onClick={() => setShowMenu(!showMenu)}
          aria-label="Меню"
        >
          <span /><span /><span />
        </button>
        <div className="shop-header__center">
          <img src="/logo.jpg" alt="Sushi House" className="shop-header__logo" />
          <span className="shop-header__title">Sushi House</span>
        </div>
        {cart.count > 0 ? (
          <button className="shop-header__cart" onClick={() => setShowCart(true)}>
            <span className="shop-header__cart-icon">🛒</span>
            <span className="shop-header__cart-badge">{cart.count}</span>
          </button>
        ) : (
          <div className="shop-header__spacer" />
        )}
      </header>

      {/* Выпадающее меню навигации */}
      {showMenu && (
        <>
          <div className="shop-menu-overlay" onClick={() => setShowMenu(false)} />
          <nav className="shop-menu">
            <button
              className={`shop-menu__item ${activeCategory === null ? 'shop-menu__item--active' : ''}`}
              onClick={() => { setActiveCategory(null); setShowMenu(false); }}
            >
              <span className="shop-menu__icon">📋</span>
              <span>Всё меню</span>
            </button>
            {SHOP_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`shop-menu__item ${activeCategory === cat.id ? 'shop-menu__item--active' : ''}`}
                onClick={() => { setActiveCategory(cat.id); setShowMenu(false); }}
              >
                <span className="shop-menu__icon">{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </nav>
        </>
      )}

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
        <div>
          {SHOP_CATEGORIES.map(cat => {
            const catProducts = products.filter(p => p.category === cat.id);
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
