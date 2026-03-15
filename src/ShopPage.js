// src/ShopPage.js — Главная страница магазина /shop

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useCart } from './hooks/useFrontpad';
import BrandLoader from './components/BrandLoader';
import { getProductImage } from './config/imageMap';
import ShopProductCard from './components/ShopProductCard';
import CartPanel from './components/CartPanel';
import CheckoutForm from './components/CheckoutForm';
import './shop.css';

// 3 категории с путями к JSON
const SHOP_CATEGORIES = [
  { id: 'cold-rolls', name: 'Холодные роллы', tab: 'Холодные', icon: '🍣', jsonUrl: '/холодные роллы/rolls.json' },
  { id: 'hot-rolls', name: 'Запеченные роллы', tab: 'Запечённые', icon: '🔥', jsonUrl: '/запеченные роллы/zaproll.json' },
  { id: 'sets', name: 'Сеты', tab: 'Сеты', icon: '🍱', jsonUrl: '/сеты/set.json' },
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
          const res = await fetch(cat.jsonUrl + '?v=' + Date.now());
          if (!res.ok) throw new Error(`Ошибка загрузки ${cat.name}`);
          const data = await res.json();
          return data.items.filter(item => item.enabled !== false).map((item, idx) => ({
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

  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [visibleCategory, setVisibleCategory] = useState(SHOP_CATEGORIES[0]?.id);
  const sectionRefs = useRef({});
  const isScrollingByClick = useRef(false);

  // Тройной клик по логотипу → админка
  const logoClicksRef = useRef({ count: 0, timer: null });
  const handleLogoClick = () => {
    const ref = logoClicksRef.current;
    ref.count++;
    clearTimeout(ref.timer);
    if (ref.count >= 3) {
      ref.count = 0;
      window.location.href = '/admin';
      return;
    }
    ref.timer = setTimeout(() => { ref.count = 0; }, 1000);
  };

  // Telegram ID
  const telegramId = useMemo(() => {
    const tg = window.Telegram?.WebApp;
    const tgId = tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null;
    if (tgId) return tgId;
    const params = new URLSearchParams(window.location.search);
    return params.get('telegram_id') || null;
  }, []);

  // IntersectionObserver — подсветка активного таба при скролле
  useEffect(() => {
    const sections = Object.values(sectionRefs.current).filter(Boolean);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingByClick.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisibleCategory(entry.target.dataset.categoryId);
            break;
          }
        }
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: 0 }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [products]);

  const scrollToCategory = (categoryId) => {
    const el = sectionRefs.current[categoryId];
    if (!el) return;
    setVisibleCategory(categoryId);
    isScrollingByClick.current = true;
    el.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => { isScrollingByClick.current = false; }, 800);
  };

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
        <div className="shop-header__center">
          <img src="/logo.jpg" alt="Sushi House" className="shop-header__logo" onClick={handleLogoClick} />
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

      {/* Sticky-табы категорий */}
      <nav className="shop-tabs">
        {SHOP_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`shop-tabs__item ${visibleCategory === cat.id ? 'shop-tabs__item--active' : ''}`}
            onClick={() => scrollToCategory(cat.id)}
          >
            <span className="shop-tabs__icon">{cat.icon}</span>
            <span className="shop-tabs__name">{cat.tab}</span>
          </button>
        ))}
      </nav>

      {/* Контент */}
      {loading ? (
        <BrandLoader text="Загружаем меню" />
      ) : error ? (
        <div className="shop-error">
          <span className="shop-error__text">{error}</span>
          <button className="shop-error__retry" onClick={refetch}>Попробовать снова</button>
        </div>
      ) : (
        <div>
          {SHOP_CATEGORIES.map(cat => {
            const catProducts = products.filter(p => p.category === cat.id);
            if (catProducts.length === 0) return null;
            return (
              <div
                key={cat.id}
                className="shop-section"
                data-category-id={cat.id}
                ref={el => { sectionRefs.current[cat.id] = el; }}
              >
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
