// src/DiscountShopPage.js — Магазин по подписке /discount-shop
// Основное меню (скидки) + отдельные экраны подарков

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from './UserContext';
import { useCart } from './hooks/useFrontpad';
import BrandLoader from './components/BrandLoader';
import { getProductImage } from './config/imageMap';
import ShopProductCard from './components/ShopProductCard';
import CartPanel from './components/CartPanel';
import CheckoutForm from './components/CheckoutForm';
import SubCheckoutModal from './components/SubCheckoutModal';
import PromoBanner from './components/PromoBanner';
import './shop.css';

const DISCOUNT_CATEGORIES = [
  { id: 'sub-cold', name: 'Холодные роллы', tab: 'Холодные', icon: '🍣',
    jsonUrl: '/подписка роллы/rolls-sub.json', discount: 0.30 },
  { id: 'sub-hot', name: 'Запечённые роллы', tab: 'Запечённые', icon: '🔥',
    jsonUrl: '/подписка запеченные/zaproll-sub.json', discount: 0.30 },
  { id: 'sub-sets', name: 'Сеты', tab: 'Сеты', icon: '🍱',
    jsonUrl: '/подписка сеты/sets-sub.json', discount: 0.20 },
];

const GIFT_CATEGORIES = [
  { id: 'gift-rolls', name: 'Роллы в подарок', tab: 'Роллы', icon: '🎁',
    jsonUrl: '/подписка 490/rolls-490.json', minTarif: '490' },
  { id: 'gift-sets', name: 'Сеты в подарок', tab: 'Сеты', icon: '🎁',
    jsonUrl: '/подписка 490/sets-490.json', minTarif: '1190' },
];

function isGiftLocked(cat, userTarif) {
  if (!userTarif) return true;
  // 9990 (амбассадор) — доступ ко всем подаркам
  if (userTarif === '9990') return false;
  // Каждый тариф открывает только свою категорию подарков
  // 490 → роллы (minTarif='490'), 1190 → сеты (minTarif='1190')
  return userTarif !== cat.minTarif;
}

function useDiscountMenu() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allCats = [...DISCOUNT_CATEGORIES, ...GIFT_CATEGORIES];
      const results = await Promise.all(
        allCats.map(async (cat) => {
          const res = await fetch(cat.jsonUrl + '?v=' + Date.now());
          if (!res.ok) throw new Error(`Ошибка загрузки ${cat.name}`);
          const data = await res.json();
          const isGift = GIFT_CATEGORIES.some(g => g.id === cat.id);
          return data.items.filter(item => item.enabled !== false).map((item, idx) => {
            if (isGift) {
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

  // Уведомление об успешной оплате
  const [paymentSuccess, setPaymentSuccess] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('payment') === 'success';
  });

  useEffect(() => {
    if (paymentSuccess) {
      const timer = setTimeout(() => setPaymentSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [paymentSuccess]);

  const { telegramId, loading: userLoading, tarif: userTarif } = useUser();
  const { products, loading, error, refetch } = useDiscountMenu();
  const cart = useCart();

  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [visibleCategory, setVisibleCategory] = useState(DISCOUNT_CATEGORIES[0]?.id);
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

  // Gift view: null = основное меню, 'gift-rolls' | 'gift-sets' = подарочный экран
  // Поддержка ?view=gift-rolls / ?view=gift-sets для прямой ссылки
  const initialView = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    return (v === 'gift-rolls' || v === 'gift-sets') ? v : null;
  }, []);
  const [giftView, setGiftView] = useState(initialView);
  const [selectedGiftProduct, setSelectedGiftProduct] = useState(null);
  const [giftOrderNumber, setGiftOrderNumber] = useState(null);

  const [lockedPopup, setLockedPopup] = useState(null);

  // Gift windows
  const [giftStatus, setGiftStatus] = useState(null);
  const [giftStatusLoading, setGiftStatusLoading] = useState(true);
  const [contactId, setContactId] = useState(null);
  const [adminGrants, setAdminGrants] = useState({ roll: false, set: false });

  // Gift window status from server (Vercel Blob)
  const fetchGiftStatus = useCallback(() => {
    if (!telegramId) { setGiftStatusLoading(false); return; }
    setGiftStatusLoading(true);
    fetch('/api/get-gift-windows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: telegramId }),
    })
      .then(r => r.json())
      .then(resp => {
        if (!resp.success || !resp.data) return;
        const d = resp.data;
        if (d.contact_id) setContactId(d.contact_id);
        if (d.adminGrants) setAdminGrants(d.adminGrants);
        setGiftStatus({
          status: d.currentStatus,
          daysLeft: d.daysLeft,
          windowNum: d.currentWindow,
          totalWindows: d.totalWindows,
        });
      })
      .catch(() => {})
      .finally(() => setGiftStatusLoading(false));
  }, [telegramId]);

  useEffect(() => { fetchGiftStatus(); }, [fetchGiftStatus]);

  // IntersectionObserver для скидочных табов
  useEffect(() => {
    if (giftView) return;
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
  }, [products, giftView]);

  const scrollToCategory = (categoryId) => {
    const el = sectionRefs.current[categoryId];
    if (!el) return;
    setVisibleCategory(categoryId);
    isScrollingByClick.current = true;
    el.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => { isScrollingByClick.current = false; }, 800);
  };

  const tarifLoading = userLoading;

  const handleGiftClick = (catId) => {
    if (tarifLoading || giftStatusLoading) return;
    const cat = GIFT_CATEGORIES.find(c => c.id === catId);
    if (!cat) return;

    // Admin-гранты обходят проверку тарифа
    const hasAdminGrant = (catId === 'gift-rolls' && adminGrants.roll) || (catId === 'gift-sets' && adminGrants.set);

    if (!hasAdminGrant && isGiftLocked(cat, userTarif)) {
      const tarifLabel = cat.minTarif === '1190' ? '1190' : '490';
      setLockedPopup(`Этот раздел доступен подписчикам тарифа от ${tarifLabel}₽`);
      return;
    }
    // Block if gift already claimed or waiting (only for non-admin grants)
    if (!hasAdminGrant && giftStatus && giftStatus.status === 'claimed') return;
    if (!hasAdminGrant && giftStatus && giftStatus.status === 'waiting') return;
    setGiftView(catId);
    window.scrollTo(0, 0);
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

  // Success screens
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

  if (giftOrderNumber) {
    return (
      <div className="shop-page">
        <div className="shop-success">
          <div className="shop-success__icon">✅</div>
          <h2 className="shop-success__title">Заказ принят!</h2>
          <p className="shop-success__order-num">Номер заказа: {giftOrderNumber}</p>
          <p className="shop-success__text">Мы уже готовим ваш заказ. Ожидайте!</p>
          <button className="shop-success__btn" onClick={() => { setGiftOrderNumber(null); setGiftView(null); }}>
            Вернуться в меню
          </button>
        </div>
      </div>
    );
  }

  // === GIFT VIEW — отдельный экран подарков ===
  if (giftView) {
    const giftCat = GIFT_CATEGORIES.find(c => c.id === giftView);
    const giftProducts = products.filter(p => p.category === giftView);

    return (
      <div className="shop-page">
        <header className="shop-header">
          <button className="shop-header__back" onClick={() => setGiftView(null)}>
            ←
          </button>
          <div className="shop-header__center">
            <span className="shop-header__title">{giftCat?.icon} {giftCat?.name}</span>
          </div>
          <div className="shop-header__spacer" />
        </header>

        <div className="shop-section">
          <p style={{ color: '#999', fontSize: 13, margin: '8px 16px 0', padding: 0 }}>
            Выберите один — входит в вашу подписку
          </p>
        </div>

        {loading ? (
          <BrandLoader text="Загружаем подарки" />
        ) : (
          <div className="shop-grid">
            {giftProducts.map(product => (
              <SubCard
                key={product.id}
                product={product}
                onSelect={setSelectedGiftProduct}
              />
            ))}
          </div>
        )}

        {selectedGiftProduct && (
          <SubCheckoutModal
            product={selectedGiftProduct}
            telegramId={telegramId}
            contactId={contactId}
            onClose={() => setSelectedGiftProduct(null)}
            onSuccess={(num) => {
              setSelectedGiftProduct(null);
              setGiftOrderNumber(num);
              fetchGiftStatus();
            }}
          />
        )}
      </div>
    );
  }

  // === MAIN VIEW — скидочное меню + кнопки подарков ===
  return (
    <div className="shop-page">
      <header className="shop-header">
        <div className="shop-header__center">
          <img src="/logo.jpg" alt="Sushi House" className="shop-header__logo" onClick={handleLogoClick} />
          <span className="shop-header__title">Sushi House</span>
        </div>
        <div className="shop-header__actions">
          <button
            className="shop-header__profile"
            onClick={() => {
              const tid = telegramId ? `?telegram_id=${telegramId}` : '';
              window.location.href = `/profile${tid}`;
            }}
          >
            👤
          </button>
          {cart.count > 0 && (
            <button className="shop-header__cart" onClick={() => setShowCart(true)}>
              <span className="shop-header__cart-icon">🛒</span>
              <span className="shop-header__cart-badge">{cart.count}</span>
            </button>
          )}
        </div>
      </header>

      {paymentSuccess && (
        <div className="payment-success-banner" onClick={() => setPaymentSuccess(false)}>
          Оплата прошла успешно! Подписка активирована.
        </div>
      )}

      <div className="shop-gift-row">
        {GIFT_CATEGORIES.map(cat => {
          const anyLoading = tarifLoading || giftStatusLoading;
          const hasAdminGrant = (cat.id === 'gift-rolls' && adminGrants.roll) || (cat.id === 'gift-sets' && adminGrants.set);
          const locked = anyLoading ? true : (!hasAdminGrant && isGiftLocked(cat, userTarif));
          // Hide gift button if subscription expired (but not if admin granted)
          if (!locked && !hasAdminGrant && giftStatus && giftStatus.status === 'expired') return null;

          const isClaimed = !locked && !hasAdminGrant && giftStatus && giftStatus.status === 'claimed';
          const isWaiting = !locked && !hasAdminGrant && giftStatus && giftStatus.status === 'waiting';
          const isDisabled = locked || isClaimed || isWaiting;

          let label = `${cat.icon} ${cat.tab}`;
          let extraClass = '';
          let badge = null;

          if (anyLoading) {
            badge = <span className="shop-gift-btn__lock">...</span>;
          } else if (locked) {
            badge = <span className="shop-gift-btn__lock">🔒</span>;
          } else if (isClaimed) {
            label = `✓ Получен`;
            extraClass = 'shop-gift-btn--claimed';
          } else if (isWaiting) {
            label = `${cat.icon} Через ${giftStatus.daysLeft} дн.`;
            extraClass = 'shop-gift-btn--waiting';
          }

          return (
            <button
              key={cat.id}
              className={`shop-gift-btn ${isDisabled ? 'shop-gift-btn--locked' : ''} ${extraClass}`}
              onClick={() => handleGiftClick(cat.id)}
              disabled={isDisabled}
            >
              <span>{label}</span>
              {badge}
            </button>
          );
        })}
      </div>

      <PromoBanner />

      <nav className="shop-tabs">
        {DISCOUNT_CATEGORIES.map(cat => (
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
        <BrandLoader text="Загружаем меню" />
      ) : error ? (
        <div className="shop-error">
          <span className="shop-error__text">{error}</span>
          <button className="shop-error__retry" onClick={refetch}>Попробовать снова</button>
        </div>
      ) : (
        <div>
          {DISCOUNT_CATEGORIES.map(cat => {
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
