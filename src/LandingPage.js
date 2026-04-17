// src/LandingPage.js — Главная страница с меню для подписчиков

import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import './shop.css';
import BrandLoader from './components/BrandLoader';
import LoginPage from './LoginPage';
import AppFooter from './components/AppFooter';

const TARIFFS = [
  {
    price: '290',
    label: '290 ₽ / месяц',
    desc: 'Скидки на меню',
  },
  {
    price: '490',
    label: '690 ₽ / месяц',
    desc: 'Скидки + подарочные роллы',
  },
  {
    price: '1190',
    label: '1390 ₽ / месяц',
    desc: 'Скидки + роллы + сеты + VIP-доступ',
  },
];

function LandingPage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const { telegramId, loading: userLoading, profile, sync } = useUser();
  const [redirecting, setRedirecting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('splash_shown'));

  // Проверяем активную подписку
  const hasActiveSubscription = React.useMemo(() => {
    if (!profile) return false;
    const status = profile.subscriptionStatus || profile.статусСписания;
    return status === 'активно';
  }, [profile]);

  // Тройной клик по логотипу → админка
  const logoClicksRef = React.useRef({ count: 0, timer: null });
  const handleLogoClick = () => {
    const ref = logoClicksRef.current;
    ref.count++;
    clearTimeout(ref.timer);
    if (ref.count >= 3) {
      ref.count = 0;
      window.location.href = telegramId ? `/admin?telegram_id=${telegramId}` : '/admin';
      return;
    }
    ref.timer = setTimeout(() => { ref.count = 0; }, 1000);
  };

  // Обработка возврата после успешной оплаты
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      setPaymentSuccess(true);
      params.delete('payment');
      const cleanUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname + (params.get('telegram_id') ? `?telegram_id=${params.get('telegram_id')}` : '');
      window.history.replaceState({}, '', cleanUrl);
      sync(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userLoading || !telegramId) return;
    if (hasActiveSubscription) {
      setRedirecting(true);
      window.location.href = `/discount-shop?telegram_id=${telegramId}`;
    }
  }, [userLoading, telegramId, hasActiveSubscription]);

  const handleTariffClick = (price) => {
    const tid = telegramId ? `?telegram_id=${telegramId}` : '';
    window.location.href = `/pay/${price}${tid}`;
  };

  // Пока грузим или есть активная подписка — лоадер / редирект
  if (userLoading || redirecting || hasActiveSubscription) {
    return (
      <div className="shop-page">
        <BrandLoader text="Проверяем подписку" />
      </div>
    );
  }

  // Сплэш — первый экран для всех без активной подписки (включая веб/реферальных)
  if (showSplash) {
    return (
      <div className="shop-page" style={{ padding: 0 }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 480, margin: '0 auto' }}>
          <img
            src="/photo_2026-04-08_17-42-09.jpg"
            alt="Суши-Хаус 39 — подписка"
            style={{ width: '100%', display: 'block' }}
          />
          <button
            onClick={() => { sessionStorage.setItem('splash_shown', '1'); setShowSplash(false); }}
            aria-label="Оформить подписку"
            style={{
              position: 'absolute',
              bottom: '2%',
              left: '8%',
              right: '8%',
              height: '9%',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 40,
            }}
          />
        </div>
      </div>
    );
  }

  // После сплэша: веб-пользователь не авторизован — форма входа
  if (!telegramId) {
    return <LoginPage />;
  }

  return (
    <div className="shop-page">
      {paymentSuccess && (
        <div className="shop-toast shop-toast--success">
          Оплата прошла успешно! Подписка оформляется...
        </div>
      )}
      <div className="shop-landing">
        <img src="/logo.jpg" alt="Суши-Хаус 39" className="shop-landing__logo" onClick={handleLogoClick} style={{ cursor: 'default' }} />
        <h1 className="shop-landing__title">СУШИ-ХАУС 39</h1>
        <p className="shop-landing__subtitle">Подписка со скидками и подарками</p>

        <div className="shop-landing__cards">
          {TARIFFS.map(t => (
            <button
              key={t.price}
              className="shop-landing__card"
              onClick={() => handleTariffClick(t.price)}
            >
              <div className="shop-landing__card-price">{t.label}</div>
              <div className="shop-landing__card-desc">{t.desc}</div>
            </button>
          ))}
        </div>

      </div>
      <AppFooter />
    </div>
  );
}

export default LandingPage;
