import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useUser } from './UserContext';
import { useCart } from './hooks/useFrontpad';
import BrandLoader from './components/BrandLoader';
import { getProductImage } from './config/imageMap';
import { getProductDescription } from './config/descriptionMap';
import ShopProductCard from './components/ShopProductCard';
import ProductModal from './components/ProductModal';
import CartPanel from './components/CartPanel';
import CheckoutForm from './components/CheckoutForm';
import { useCartGifts } from './hooks/useCartGifts';
import AppFooter from './components/AppFooter';
import GamesModal from './components/GamesModal';
import './shop.css';
import './shop-v2.css';

const DISCOUNT_CATEGORIES = [
  {
    id: 'sub-cold',
    name: 'Холодные роллы',
    tab: 'Холодные',
    icon: '🍣',
    jsonUrl: '/подписка роллы/rolls-sub.json',
    discount: 0.30,
  },
  {
    id: 'sub-hot',
    name: 'Запечённые роллы',
    tab: 'Запечённые',
    icon: '🔥',
    jsonUrl: '/подписка запеченные/zaproll-sub.json',
    discount: 0.30,
  },
  {
    id: 'sub-sets',
    name: 'Сеты',
    tab: 'Сеты',
    icon: '🍱',
    jsonUrl: '/подписка сеты/sets-sub.json',
    discount: 0.20,
  },
  {
    id: 'sub-gunkan',
    name: 'Гунканы',
    tab: 'Гунканы',
    icon: '🍣',
    jsonUrl: '/гунканы/gunkan.json',
    discount: 0.30,
  },
  {
    id: 'sub-sauces',
    name: 'Добавки',
    tab: 'Добавки',
    icon: '🥄',
    jsonUrl: '/добавки/sauces.json',
    discount: 0,
  },
];

const GIFT_CATEGORIES = [
  {
    id: 'gift-rolls',
    name: 'Роллы в подарок',
    tab: 'Роллы',
    icon: '🎁',
    jsonUrl: '/подписка 490/rolls-490.json',
    minTarif: '490',
  },
  {
    id: 'gift-sets',
    name: 'Сеты в подарок',
    tab: 'Сеты',
    icon: '🎁',
    jsonUrl: '/подписка 490/sets-490.json',
    minTarif: '1190',
  },
];

function isGiftLocked(category, userTarif) {
  if (!userTarif) return true;
  if (userTarif === '9990') return false;
  return userTarif !== category.minTarif;
}

const GIFT_TYPE_LABEL = { 'gift-rolls': 'Ролл', 'gift-sets': 'Сет' };

function useDiscountMenu() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const allCategories = [...DISCOUNT_CATEGORIES, ...GIFT_CATEGORIES];
      const results = await Promise.all(
        allCategories.map(async category => {
          const res = await fetch(`${category.jsonUrl}?v=${Date.now()}`);
          if (!res.ok) throw new Error(`Ошибка загрузки ${category.name}`);

          const data = await res.json();
          const isGiftCategory = GIFT_CATEGORIES.some(item => item.id === category.id);

          return data.items
            .filter(item => item.enabled !== false)
            .map((item, idx) => {
              if (isGiftCategory) {
                return {
                  id: item.sku || `${category.id}-${idx}`,
                  name: item.name,
                  cleanName: item.name,
                  price: 0,
                  sku: item.sku,
                  category: category.id,
                  gift: true,
                  image: item.image || getProductImage(item.name),
                  description: item.description || null,
                };
              }

              const oldPrice = item.price;
              const discountPrice = Math.round(oldPrice * (1 - category.discount));

              return {
                id: item.sku || `${category.id}-${idx}`,
                name: item.name,
                cleanName: item.name,
                oldPrice,
                price: discountPrice,
                savings: oldPrice - discountPrice,
                category: category.id,
                image: getProductImage(item.name),
                description: item.description || null,
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

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { products, loading, error, refetch: fetchAll };
}

function SubCard({ product, onSelect, onImageClick, disabled }) {
  const [imgError, setImgError] = useState(false);
  
  // Обработчик кнопки "Выбрать"
  const handleSelect = (e) => {
    // Предотвращаем стандартное поведение и всплытие события
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (disabled) return;
    
    console.log('SubCard: Select button clicked for product:', product.name);
    
    // Вызываем обработчик выбора, передавая ему продукт
    if (onSelect) {
      onSelect(product);
    }
  };

  return (
    <div className="shop-card">
      <div
        className="shop-card__image-wrap"
        onClick={() => onImageClick && onImageClick(product)}
        style={onImageClick ? { cursor: 'pointer' } : undefined}
      >
        <img
          src={imgError ? '/logo.jpg' : product.image}
          alt={product.name}
          className="shop-card__image"
          onError={() => setImgError(true)}
        />
      </div>

      <div className="shop-card__body">
        <h3 className="shop-card__name">{product.name}</h3>
        {product.description && (
          <p className="shop-card__desc">{product.description}</p>
        )}
        <div className="shop-card__bottom">
          <span className="shop-card__price" style={{ color: '#3CC8A1' }}>Подарок</span>
          <button 
            className="shop-card__add-btn" 
            onClick={handleSelect} 
            disabled={disabled}
          >
            {disabled ? '...' : 'Выбрать'}
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

  const [paymentSuccess, setPaymentSuccess] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('payment') === 'success';
  });

  useEffect(() => {
    if (!paymentSuccess) return undefined;
    const timer = setTimeout(() => setPaymentSuccess(false), 5000);
    return () => clearTimeout(timer);
  }, [paymentSuccess]);

  const { telegramId, loading: userLoading, tarif: userTarif, profile } = useUser();
  const { products, loading, error, refetch } = useDiscountMenu();
  const cart = useCart();

  const [promoCode, setPromoCode] = useState('');
  const { messages: promoMessages, isPromoValid } = useCartGifts({
    items: cart.items,
    promoCode,
    addItem: cart.addItem,
    removeItem: cart.removeItem,
  });

  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [visibleCategory, setVisibleCategory] = useState(DISCOUNT_CATEGORIES[0]?.id);
  const sectionRefs = useRef({});
  const isScrollingByClick = useRef(false);
  const tabsNavRef = useRef(null);
  const tabsItemRefs = useRef({});
  const [giftClaimingId, setGiftClaimingId] = useState(null);
  const [giftNotice, setGiftNotice] = useState(null);
  const logoClicksRef = useRef({ count: 0, timer: null });

  const initialView = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    return view === 'gift-rolls' || view === 'gift-sets' ? view : null;
  }, []);

  const [giftView, setGiftView] = useState(initialView);
  const [modalProduct, setModalProduct] = useState(null);
  const [lockedPopup, setLockedPopup] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [gamesOpen, setGamesOpen] = useState(false);
  const [giftStatus, setGiftStatus] = useState(null);
  const [giftStatusLoading, setGiftStatusLoading] = useState(true);
  const [adminGrants, setAdminGrants] = useState({ roll: false, set: false });

  const pendingGiftItem = cart.items.find(item => item.product.gift) || null;
  const pendingGiftCategory = pendingGiftItem?.product?.category || null;
  const hasGiftInCart = Boolean(pendingGiftItem);

  const handleLogoClick = () => {
    const state = logoClicksRef.current;
    state.count += 1;
    clearTimeout(state.timer);

    if (state.count >= 3) {
      state.count = 0;
      window.location.href = telegramId ? `/admin?telegram_id=${telegramId}` : '/admin';
      return;
    }

    state.timer = setTimeout(() => {
      state.count = 0;
    }, 1000);
  };

  const fetchGiftStatus = useCallback(() => {
    if (!telegramId) {
      setGiftStatusLoading(false);
      return;
    }

    setGiftStatusLoading(true);
    fetch('/api/get-gift-windows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: telegramId }),
    })
      .then(r => r.json())
      .then(resp => {
        if (!resp.success || !resp.data) return;
        const data = resp.data;
        if (data.adminGrants) setAdminGrants(data.adminGrants);
        setGiftStatus({
          status: data.currentStatus,
          daysLeft: data.daysLeft,
          windowNum: data.currentWindow,
          totalWindows: data.totalWindows,
        });
      })
      .catch(() => {})
      .finally(() => setGiftStatusLoading(false));
  }, [telegramId]);

  useEffect(() => {
    fetchGiftStatus();
  }, [fetchGiftStatus]);

  useEffect(() => {
    if (!giftNotice) return undefined;
    const timer = setTimeout(() => setGiftNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [giftNotice]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (giftView) params.set('view', giftView);
    else params.delete('view');

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState({}, '', nextUrl);
    }
  }, [giftView]);

  useEffect(() => {
    if (!giftView || userLoading || giftStatusLoading) return;

    const category = GIFT_CATEGORIES.find(item => item.id === giftView);
    if (!category) {
      setGiftView(null);
      return;
    }

    // Если это переход из URL параметра (т.е. initialView), 
    // то проверяем доступность и показываем соответствующие сообщения
    if (giftView === initialView) {
      const hasAdminGrant =
        (giftView === 'gift-rolls' && adminGrants.roll) ||
        (giftView === 'gift-sets' && adminGrants.set);

      const locked = !hasAdminGrant && isGiftLocked(category, userTarif);
      
      if (locked) {
        const tarifLabel = category.minTarif === '1190' ? '1190' : '490';
        setLockedPopup(`Этот раздел доступен подписчикам тарифа от ${tarifLabel}₽`);
        setGiftView(null);
        return;
      }
      
      const blockedByStatus =
        !hasAdminGrant &&
        giftStatus &&
        (giftStatus.status === 'claimed' || giftStatus.status === 'waiting' || giftStatus.status === 'expired');

      if (blockedByStatus) {
        if (giftStatus.status === 'claimed') {
          setLockedPopup('Вы уже получили подарок в этом периоде.');
        } else if (giftStatus.status === 'waiting') {
          setLockedPopup(`Подарок будет доступен через ${giftStatus.daysLeft} дней.`);
        }
        setGiftView(null);
        return;
      }
      
      if (hasGiftInCart) {
        setGiftView(null);
        return;
      }
    }
  }, [adminGrants.roll, adminGrants.set, giftStatus, giftStatusLoading, giftView, hasGiftInCart, initialView, userLoading, userTarif]);

  useEffect(() => {
    if (userLoading) return;

    // Защита от редиректа до загрузки профиля
    if (!profile) {
      console.warn('[DiscountShop] Профиль не загружен, ждём...');
      return;
    }
    
    // 🔍 DEBUG: Логируем данные для диагностики
    console.log('[DiscountShop] Проверка подписки:', {
      userLoading,
      telegramId,
      profile,
      'profile?.статусСписания': profile?.статусСписания,
      'profile?.subscriptionStatus': profile?.subscriptionStatus,
      'profile?.датаНачала': profile?.датаНачала,
      'profile?.датаОКОНЧАНИЯ': profile?.датаОКОНЧАНИЯ,
    });

    // ФИКС: Используем правильное поле статуса
    if (profile?.статусСписания === 'активно') {
      console.log('[DiscountShop] Подписка активна, показываем магазин');
      return;
    }

    console.warn('[DiscountShop] Подписка неактивна, редирект на лендинг');
    const tid = telegramId ? `?telegram_id=${telegramId}` : '';
    window.location.href = `/${tid}`;
  }, [profile?.статусСписания, telegramId, userLoading, profile]);

  useEffect(() => {
    const nav = tabsNavRef.current;
    const activeBtn = tabsItemRefs.current[visibleCategory];
    if (!nav || !activeBtn) return;
    const navLeft = nav.scrollLeft;
    const navRight = navLeft + nav.offsetWidth;
    const btnLeft = activeBtn.offsetLeft;
    const btnRight = btnLeft + activeBtn.offsetWidth;
    if (btnLeft < navLeft || btnRight > navRight) {
      nav.scrollTo({ left: btnLeft - nav.offsetWidth / 2 + activeBtn.offsetWidth / 2, behavior: 'smooth' });
    }
  }, [visibleCategory]);

  useEffect(() => {
    if (giftView) return;

    const sections = Object.values(sectionRefs.current).filter(Boolean);
    if (sections.length === 0) return undefined;

    const observer = new IntersectionObserver(
      entries => {
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

    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [giftView, products]);

  const scrollToCategory = categoryId => {
    const element = sectionRefs.current[categoryId];
    if (!element) return;

    setVisibleCategory(categoryId);
    isScrollingByClick.current = true;
    element.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      isScrollingByClick.current = false;
    }, 800);
  };

  const tarifLoading = userLoading;

  // 🔍 DEBUG: Логируем проверку статуса подписки
  console.log('[DiscountShop] Проверка статуса подписки:', {
    userLoading,
    tarifLoading,
    profile,
    'profile?.статусСписания': profile?.статусСписания,
    'profile?.subscriptionStatus': profile?.subscriptionStatus,
  });

  // ФИКС: Используем правильное поле статуса и добавляем защиту от null
  if (userLoading || !profile || profile?.статусСписания !== 'активно') {
    return (
      <div className="shop-page">
        <BrandLoader text="Проверяем подписку" />
      </div>
    );
  }

  const handleGiftClick = categoryId => {
    if (tarifLoading || giftStatusLoading) return;
    if (hasGiftInCart) {
      return;
    }

    const category = GIFT_CATEGORIES.find(item => item.id === categoryId);
    if (!category) return;

    const hasAdminGrant =
      (categoryId === 'gift-rolls' && adminGrants.roll) ||
      (categoryId === 'gift-sets' && adminGrants.set);

    if (!hasAdminGrant && isGiftLocked(category, userTarif)) {
      const tarifLabel = category.minTarif === '1190' ? '1190' : '490';
      setLockedPopup(`Этот раздел доступен подписчикам тарифа от ${tarifLabel}₽`);
      return;
    }

    if (!hasAdminGrant && giftStatus && giftStatus.status === 'claimed') {
      setLockedPopup('Вы уже получили подарок в этом периоде. Следующий будет доступен позже.');
      return;
    }
    
    if (!hasAdminGrant && giftStatus && giftStatus.status === 'waiting') {
      setLockedPopup(`Подарок будет доступен через ${giftStatus.daysLeft} дней.`);
      return;
    }

    setGiftView(categoryId);
    window.scrollTo(0, 0);
  };

  const getQuantity = productId => {
    const item = cart.items.find(entry => (entry.product.cartId || entry.product.id) === productId);
    return item ? item.quantity : 0;
  };

  const handleCheckout = () => {
    setShowCart(false);
    setShowCheckout(true);
  };

  const handleOrderSuccess = (num, orderData = null) => {
    setShowCheckout(false);
    setOrderNumber(num);

    if (hasGiftInCart) {
      setGiftStatus(prev => (prev ? { ...prev, status: 'claimed' } : prev));
      fetchGiftStatus();
    }

    cart.clear();
  };

  const handleGiftSelect = (product) => {
    console.log('handleGiftSelect called with product:', product);
    
    // Проверяем, есть ли уже подарок в корзине
    if (hasGiftInCart) {
      setGiftView(null);
      return;
    }
    
    // Проверяем, есть ли telegramId
    if (!telegramId) {
      console.log('No telegramId, showing popup');
      setLockedPopup('Для выбора подарка необходимо авторизоваться через Telegram или указать telegram_id в параметрах.');
      setGiftView(null);
      return;
    }
    
    // Устанавливаем ID выбираемого подарка для блокировки повторного выбора
    setGiftClaimingId(product.id);
    
    try {
      // Создаем модифицированный продукт для корзины
      const cartProduct = {
        ...product,
        cartId: `gift:${giftView}:${product.id}`,
        cleanName: product.name,
        gift: true,
      };
      
      // Добавляем подарок в корзину
      cart.addItem(cartProduct);
      
      // Возвращаемся на главную страницу магазина
      setGiftView(null);
      
      // Прокручиваем страницу вверх
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      // В случае ошибки показываем сообщение
      console.error('Error adding gift to cart:', err);
      setLockedPopup(err.message || 'Не удалось добавить подарок');
      setGiftView(null);
    } finally {
      // В любом случае сбрасываем ID выбираемого подарка
      setGiftClaimingId(null);
    }
  };

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

  if (giftView) {
    const giftCategory = GIFT_CATEGORIES.find(item => item.id === giftView);
    const giftProducts = products.filter(item => item.category === giftView);

    return (
      <div className="shop-page">
        <header className="shop-header">
          <button 
            className="shop-header__back" 
            onClick={() => {
              // Просто возвращаемся на главную страницу
              setGiftView(null);
            }}
          >
            ←
          </button>
          <div className="shop-header__center">
            <span className="shop-header__title">{giftCategory?.icon} {giftCategory?.name}</span>
          </div>
          <div className="shop-header__spacer" />
        </header>

        {loading ? (
          <BrandLoader text="Загружаем подарки" />
        ) : (
          <div className="shop-grid">
            {giftProducts.map(product => (
              <SubCard
                key={product.id}
                product={product}
                onSelect={handleGiftSelect}
                onImageClick={item => setModalProduct({ ...item, description: item.description || getProductDescription(item.name) })}
                disabled={giftClaimingId === product.id}
              />
            ))}
          </div>
        )}

        {modalProduct && (
          <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />
        )}
      </div>
    );
  }

  return (
    <>
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

      {giftNotice && (
        <div className="payment-success-banner" onClick={() => setGiftNotice(null)}>
          {giftNotice}
        </div>
      )}

      <div className="shop-gift-section">
        <p className="shop-gift-section__title">🎁 Подарки по подписке</p>
        <div className="shop-gift-row">
          {GIFT_CATEGORIES.map(category => {
            const anyLoading = tarifLoading || giftStatusLoading;
            const hasAdminGrant =
              (category.id === 'gift-rolls' && adminGrants.roll) ||
              (category.id === 'gift-sets' && adminGrants.set);

            const locked = anyLoading ? true : (!hasAdminGrant && isGiftLocked(category, userTarif));
            if (!locked && !hasAdminGrant && giftStatus && giftStatus.status === 'expired') return null;

            const isClaimed =
              !locked && !hasAdminGrant && giftStatus && giftStatus.status === 'claimed';
            const isWaiting =
              !locked && !hasAdminGrant && giftStatus && giftStatus.status === 'waiting';
            const isSelectedGift = hasGiftInCart && pendingGiftCategory === category.id;
            const isDisabled = locked || isClaimed || isWaiting || hasGiftInCart;
            const isAvailable = !isDisabled;

            let icon = category.icon;
            let extraClass = '';
            let badge = null;
            let subText = '';

            if (anyLoading) {
              badge = <span className="shop-gift-btn__lock">...</span>;
            } else if (locked) {
              badge = <span className="shop-gift-btn__lock">🔒</span>;
            } else if (isSelectedGift) {
              icon = '✓';
              subText = 'в корзине';
              extraClass = 'shop-gift-btn--claimed';
            } else if (hasGiftInCart) {
              subText = 'уже выбран';
              extraClass = 'shop-gift-btn--waiting';
            } else if (isClaimed) {
              icon = '✓';
              subText = 'получен ✓';
              extraClass = 'shop-gift-btn--claimed';
            } else if (isWaiting) {
              subText = `через ${giftStatus.daysLeft} дн.`;
              extraClass = 'shop-gift-btn--waiting';
            } else if (isAvailable) {
              subText = 'доступен ✓';
            }

            return (
              <button
                key={category.id}
                className={`shop-gift-btn ${isDisabled ? 'shop-gift-btn--locked' : ''} ${isAvailable ? 'shop-gift-btn--available' : ''} ${extraClass}`}
                onClick={() => isDisabled ? null : handleGiftClick(category.id)}
                disabled={isDisabled}
              >
                <span className="shop-gift-btn__icon">{icon}</span>
                <span className="shop-gift-btn__label">{GIFT_TYPE_LABEL[category.id] ?? category.tab}</span>
                {subText ? <span className="shop-gift-btn__sub">{subText}</span> : null}
                {badge}
              </button>
            );
          })}
        </div>
      </div>

      <div className="shop-search">
        <input
          className="shop-search__input"
          type="text"
          placeholder="🔍 Поиск по меню..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="shop-search__clear" onClick={() => setSearchQuery('')}>✕</button>
        )}
      </div>

      {!searchQuery && (
        <div className="shop-quick-row">
          <button
            className="shop-quick-btn shop-quick-btn--sauces"
            onClick={() => scrollToCategory('sub-sauces')}
          >
            <span className="shop-quick-btn__icon">🥄</span>
            <span className="shop-quick-btn__label">Добавки</span>
          </button>
          <button
            className="shop-quick-btn shop-quick-btn--games"
            onClick={() => setGamesOpen(true)}
          >
            <span className="shop-quick-btn__icon">🎮</span>
            <span className="shop-quick-btn__label">Игры</span>
          </button>
        </div>
      )}

      {!searchQuery && <nav className="shop-tabs" ref={tabsNavRef}>
        {DISCOUNT_CATEGORIES.map(category => (
          <button
            key={category.id}
            ref={el => { tabsItemRefs.current[category.id] = el; }}
            className={`shop-tabs__item ${visibleCategory === category.id ? 'shop-tabs__item--active' : ''}`}
            onClick={() => scrollToCategory(category.id)}
          >
            <span className="shop-tabs__icon">{category.icon}</span>
            <span className="shop-tabs__name">{category.tab}</span>
          </button>
        ))}
      </nav>}

      {loading ? (
        <BrandLoader text="Загружаем меню" />
      ) : error ? (
        <div className="shop-error">
          <span className="shop-error__text">{error}</span>
          <button className="shop-error__retry" onClick={refetch}>Попробовать снова</button>
        </div>
      ) : searchQuery ? (
        <div>
          {(() => {
            const q = searchQuery.toLowerCase();
            const found = products.filter(p => !p.gift && p.name.toLowerCase().includes(q));
            if (found.length === 0) return <p className="shop-search__empty">Ничего не найдено</p>;
            return (
              <div className="shop-grid" style={{ padding: '0 12px' }}>
                {found.map(product => (
                  <ShopProductCard
                    key={product.id}
                    product={product}
                    quantity={getQuantity(product.id)}
                    onAdd={cart.addItem}
                    onUpdateQuantity={cart.updateQuantity}
                    onImageClick={item => setModalProduct({ ...item, description: item.description || getProductDescription(item.name) })}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      ) : (
        <div>
          {DISCOUNT_CATEGORIES.map(category => {
            const categoryProducts = products.filter(item => item.category === category.id);
            if (categoryProducts.length === 0) return null;

            return (
              <div
                key={category.id}
                className="shop-section"
                data-category-id={category.id}
                ref={element => {
                  sectionRefs.current[category.id] = element;
                }}
              >
                <h2 className="shop-section__title">{category.icon} {category.name}</h2>
                <div className="shop-grid">
                  {categoryProducts.map(product => (
                    <ShopProductCard
                      key={product.id}
                      product={product}
                      quantity={getQuantity(product.id)}
                      onAdd={cart.addItem}
                      onUpdateQuantity={cart.updateQuantity}
                      onImageClick={item => setModalProduct({ ...item, description: item.description || getProductDescription(item.name) })}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalProduct && (
        <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />
      )}

      <GamesModal
        isOpen={gamesOpen}
        onClose={() => setGamesOpen(false)}
        isSubscriber={profile?.статусСписания === 'активно'}
      />

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

      <AppFooter />
    </div>

    {/* Всё с position:fixed вынесено за shop-page (иначе transform анимации ломает fixed) */}
    {cart.count > 0 && !showCart && !showCheckout && (
      <button className="shop-cart-fab" onClick={() => setShowCart(true)}>
        <span className="shop-cart-fab__left">
          <span>🛒</span>
          <span className="shop-cart-fab__badge">{cart.count}</span>
          <span>Оформить</span>
        </span>
        <span className="shop-cart-fab__total">{cart.total}₽</span>
      </button>
    )}

    {showCart && (
      <CartPanel
        items={cart.items}
        total={cart.total}
        onUpdateQuantity={cart.updateQuantity}
        onRemove={cart.removeItem}
        onClear={cart.clearNonGiftItems}
        onClose={() => setShowCart(false)}
        onCheckout={handleCheckout}
        onAddItem={cart.addItem}
        promoCode={promoCode}
        onPromoCodeChange={setPromoCode}
        promoMessages={promoMessages}
        isPromoValid={isPromoValid}
      />
    )}

    {showCheckout && (
      <CheckoutForm
        items={cart.items}
        total={cart.total}
        telegramId={telegramId}
        onBack={() => setShowCheckout(false)}
        onSuccess={handleOrderSuccess}
        promoCode={promoCode}
      />
    )}
    </>
  );
}

export default DiscountShopPage;
