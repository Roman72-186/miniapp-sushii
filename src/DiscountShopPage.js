// src/DiscountShopPage.js — Магазин по подписке со скидками /discount-shop (5 табов)

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useCart } from './hooks/useFrontpad';
import { getProductImage } from './config/imageMap';
import ShopProductCard from './components/ShopProductCard';
import CartPanel from './components/CartPanel';
import CheckoutForm from './components/CheckoutForm';
import SubCheckoutModal from './components/SubCheckoutModal';
import './shop.css';

const DISCOUNT_CATEGORIES = [
  { id: 'sub-cold', name: 'Холодные роллы', tab: 'Холодные', icon: '🍣',
    jsonUrl: '/подписка роллы/rolls-sub.json', discount: 0.30 },
  { id: 'sub-hot', name: 'Запечённые роллы', tab: 'Запечённые', icon: '🔥',
    jsonUrl: '/подписка запеченные/zaproll-sub.json', discount: 0.30 },
  { id: 'sub-sets', name: 'Сеты', tab: 'Сеты', icon: '🍱',
    jsonUrl: '/подписка сеты/sets-sub.json', discount: 0.20, discountLabel: '-20%' },
  { id: 'gift-rolls', name: 'Роллы в подарок', tab: 'Роллы', icon: '🎁',
    jsonUrl: '/подписка 490/rolls-490.json', discount: 0, gift: true, minTarif: '490' },
  { id: 'gift-sets', name: 'Сеты в подарок', tab: 'Сеты', icon: '🎁',
    jsonUrl: '/подписка 490/sets-490.json', discount: 0, gift: true, minTarif: '1190' },
];

function isCategoryLocked(cat, userTarif) {
  if (!cat.minTarif) return false;
  if (!userTarif) return true;
  if (cat.minTarif === '490') return userTarif !== '490' && userTarif !== '1190';
  if (cat.minTarif === '1190') return userTarif !== '1190';
  return false;
}

function useDiscountMenu() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        DISCOUNT_CATEGORIES.map(async (cat) => {
          const res = await fetch(cat.jsonUrl);
          if (!res.ok) throw new Error(`Ошибка загрузки ${cat.name}`);
          const data = await res.json();
          return data.items.map((item, idx) => {
            if (cat.gift) {
              return {
                id: item.sku || `${cat.id}-${idx}`,
                name: item.name,
                cleanName: item.name,
                price: 0,
                sku: item.sku,
                category: cat.id,
                gift: true,
                image: getProductImage(item.name),
              };
            }
            const oldPrice = item.price;
            const discountPrice = Math.round(oldPrice * (1 - cat.discount));
            const savings = oldPrice - discountPrice;
            return {
              id: item.sku || `${cat.id}-${idx}`,
              name: item.name,
              cleanName: item.name,
              oldPrice,
              price: discountPrice,
              savings,
              category: cat.id,
              image: getProductImage(item.name),
            };
          });
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
          <span className="shop-card__price" style={{ color: '#3CC8A1' }}>Подарок</span>
          <button className="shop-card__add-btn" onClick={() => onSelect(product)}>
            Выбрать
          </button>
        </div>
      </div>
    </div>
  );
}

function DiscountShopPage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const { products, loading, error, refetch } = useDiscountMenu();
  const cart = useCart();

  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [visibleCategory, setVisibleCategory] = useState(DISCOUNT_CATEGORIES[0]?.id);
  const sectionRefs = useRef({});
  const isScrollingByClick = useRef(false);

  // Gift flow
  const [selectedGiftProduct, setSelectedGiftProduct] = useState(null);
  const [giftOrderNumber, setGiftOrderNumber] = useState(null);

  // Tariff check
  const [userTarif, setUserTarif] = useState(null);
  const [tarifLoading, setTarifLoading] = useState(true);
  const [lockedPopup, setLockedPopup] = useState(null);

  const telegramId = useMemo(() => {
    const tg = window.Telegram?.WebApp;
    const tgId = tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null;
    console.log('[DiscountShop] TG SDK id:', tgId);
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('telegram_id');
    console.log('[DiscountShop] URL telegram_id:', urlId);
    return tgId || urlId || null;
  }, []);

  // Check tariff on mount
  useEffect(() => {
    if (!telegramId) {
      console.log('[DiscountShop] No telegramId, skipping tariff check');
      setTarifLoading(false);
      return;
    }
    console.log('[DiscountShop] Checking tariff for:', telegramId);
    setTarifLoading(true);
    fetch('/api/check-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: telegramId }),
    })
      .then(r => r.json())
      .then(data => {
        console.log('[DiscountShop] API response:', data);
        if (data.tarif) setUserTarif(data.tarif);
      })
      .catch((err) => {
        console.error('[DiscountShop] Tariff check failed:', err);
      })
      .finally(() => setTarifLoading(false));
  }, [telegramId]);

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
    if (tarifLoading) return;
    const cat = DISCOUNT_CATEGORIES.find(c => c.id === categoryId);
    if (cat && isCategoryLocked(cat, userTarif)) {
      const tarifLabel = cat.minTarif === '1190' ? '1190' : '490';
      setLockedPopup(`Этот раздел доступен подписчикам тарифа от ${tarifLabel}₽`);
      return;
    }
    const el = sectionRefs.current[categoryId];
    if (!el) return;
    setVisibleCategory(categoryId);
    isScrollingByClick.current = true;
    el.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => { isScrollingByClick.current = false; }, 800);
  };

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

  // Discount order success screen
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

  // Gift order success screen
  if (giftOrderNumber) {
    return (
      <div className="shop-page">
        <div className="shop-success">
          <div className="shop-success__icon">✅</div>
          <h2 className="shop-success__title">Заказ принят!</h2>
          <p className="shop-success__order-num">Номер заказа: {giftOrderNumber}</p>
          <p className="shop-success__text">Мы уже готовим ваш заказ. Ожидайте!</p>
          <button className="shop-success__btn" onClick={() => setGiftOrderNumber(null)}>
            Вернуться в меню
          </button>
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
        {cart.count > 0 ? (
          <button className="shop-header__cart" onClick={() => setShowCart(true)}>
            <span className="shop-header__cart-icon">🛒</span>
            <span className="shop-header__cart-badge">{cart.count}</span>
          </button>
        ) : (
          <div className="shop-header__spacer" />
        )}
      </header>

      <div className="shop-gift-row">
        {DISCOUNT_CATEGORIES.filter(c => c.gift).map(cat => {
          const locked = tarifLoading ? true : isCategoryLocked(cat, userTarif);
          return (
            <button
              key={cat.id}
              className={`shop-gift-btn ${locked ? 'shop-gift-btn--locked' : ''}`}
              onClick={() => scrollToCategory(cat.id)}
            >
              <span>{cat.icon} {cat.tab}</span>
              {tarifLoading ? <span className="shop-gift-btn__lock">⏳</span>
                : locked ? <span className="shop-gift-btn__lock">🔒</span>
                : null}
            </button>
          );
        })}
      </div>

      <nav className="shop-tabs">
        {DISCOUNT_CATEGORIES.filter(c => !c.gift).map(cat => (
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
      ) : (
        <div>
          {DISCOUNT_CATEGORIES.map(cat => {
            const locked = tarifLoading ? !!cat.minTarif : isCategoryLocked(cat, userTarif);
            if (locked) return null;
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
                {cat.gift && (
                  <p style={{ color: '#999', fontSize: 13, margin: '4px 16px 0', padding: 0 }}>
                    Выберите один — входит в вашу подписку
                  </p>
                )}
                <div className="shop-grid">
                  {catProducts.map(product =>
                    cat.gift ? (
                      <SubCard
                        key={product.id}
                        product={product}
                        onSelect={setSelectedGiftProduct}
                      />
                    ) : (
                      <ShopProductCard
                        key={product.id}
                        product={product}
                        quantity={getQuantity(product.id)}
                        onAdd={cart.addItem}
                        onUpdateQuantity={cart.updateQuantity}
                      />
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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

      {showCheckout && (
        <CheckoutForm
          items={cart.items}
          total={cart.total}
          telegramId={telegramId}
          onBack={() => setShowCheckout(false)}
          onSuccess={handleOrderSuccess}
        />
      )}

      {selectedGiftProduct && (
        <SubCheckoutModal
          product={selectedGiftProduct}
          telegramId={telegramId}
          onClose={() => setSelectedGiftProduct(null)}
          onSuccess={(num) => {
            setSelectedGiftProduct(null);
            setGiftOrderNumber(num);
          }}
        />
      )}

      {lockedPopup && (
        <>
          <div className="shop-locked-overlay" onClick={() => setLockedPopup(null)} />
          <div className="shop-locked-popup">
            <div className="shop-locked-popup__icon">🔒</div>
            <p className="shop-locked-popup__text">{lockedPopup}</p>
            <button className="shop-locked-popup__btn" onClick={() => setLockedPopup(null)}>
              Понятно
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default DiscountShopPage;
