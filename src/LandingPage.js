// src/LandingPage.js — Главная страница с меню для подписчиков

import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import './shop.css';
import BrandLoader from './components/BrandLoader';

const TARIFFS = [
  {
    price: '290',
    label: '290 ₽ / месяц',
    desc: 'Скидки на меню',
  },
  {
    price: '490',
    label: '490 ₽ / месяц',
    desc: 'Скидки + подарочные роллы',
  },
  {
    price: '1190',
    label: '1190 ₽ / месяц',
    desc: 'Скидки + роллы + сеты + VIP-доступ',
  },
];

function LandingPage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const { telegramId, loading: userLoading, profile, sync, isWebUser, logout } = useUser();
  const [redirecting, setRedirecting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [ambaPrice, setAmbaPrice] = useState('9 990');

  // Проверяем активную подписку
  const hasActiveSubscription = React.useMemo(() => {
    if (!profile) return false;
    const status = profile.subscriptionStatus || profile.статусСписания;
    return status === 'активно';
  }, [profile]);

  // Загружаем актуальную цену амбассадора из админки
  useEffect(() => {
    fetch('/api/admin/pricing')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.pricing?.['9990']) {
          const p = data.pricing['9990'].months?.[1] || data.pricing['9990'].price;
          if (p) setAmbaPrice(Number(p).toLocaleString('ru-RU'));
        }
      })
      .catch(() => {});
  }, []);

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

  // Веб-пользователь не авторизован — показываем страницу входа
  if (!userLoading && !telegramId) {
    return (
      <div className="shop-page">
        <div className="shop-landing">
          <img src="/logo.jpg" alt="Суши-Хаус 39" className="shop-landing__logo" onClick={handleLogoClick} style={{ cursor: 'default' }} />
          <h1 className="shop-landing__title">СУШИ-ХАУС 39</h1>
          <p className="shop-landing__subtitle">Подписка со скидками и подарками</p>
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, margin: '32px auto 0' }}>
            <button
              className="shop-payment__btn"
              onClick={() => { window.location.href = '/login'; }}
            >
              Войти по номеру телефона
            </button>
            <div style={{ textAlign: 'center', fontSize: 13, color: '#9fb0c3', lineHeight: 1.5 }}>
              Введите номер телефона — если у вас уже есть подписка, она подтянется автоматически
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (userLoading || redirecting) {
    return (
      <div className="shop-page">
        <BrandLoader text="Проверяем подписку" />
      </div>
    );
  }

  // Если есть активная подписка — показываем главное меню
  if (hasActiveSubscription) {
    return (
      <div className="shop-page">
        <div className="shop-landing">
          <img src="/logo.jpg" alt="Суши-Хаус 39" className="shop-landing__logo" onClick={handleLogoClick} style={{ cursor: 'default' }} />
          <h1 className="shop-landing__title">СУШИ-ХАУС 39</h1>
          <p className="shop-landing__subtitle">Добро пожаловать!</p>

          <div className="shop-landing__menu">
            <a
              href={`/discount-shop?telegram_id=${telegramId}`}
              className="shop-landing__menu-btn shop-landing__menu-btn--primary"
            >
              <span className="shop-landing__menu-icon">🍱</span>
              <span className="shop-landing__menu-label">Магазин со скидками</span>
            </a>

            <a
              href={`/discount-shop?view=gift-rolls&telegram_id=${telegramId}`}
              className="shop-landing__menu-btn"
            >
              <span className="shop-landing__menu-icon">🎁</span>
              <span className="shop-landing__menu-label">Подарочные роллы</span>
            </a>

            <a
              href={`/discount-shop?view=gift-sets&telegram_id=${telegramId}`}
              className="shop-landing__menu-btn"
            >
              <span className="shop-landing__menu-icon">🍱</span>
              <span className="shop-landing__menu-label">Подарочные сеты</span>
            </a>

            <a
              href={`/profile?telegram_id=${telegramId}`}
              className="shop-landing__menu-btn shop-landing__menu-btn--secondary"
            >
              <span className="shop-landing__menu-icon">👤</span>
              <span className="shop-landing__menu-label">Личный кабинет</span>
            </a>

            {isWebUser && (
              <button
                className="shop-landing__menu-btn"
                style={{ background: 'none', border: '1px solid #444', color: '#9fb0c3', cursor: 'pointer', width: '100%' }}
                onClick={logout}
              >
                <span className="shop-landing__menu-icon">🚪</span>
                <span className="shop-landing__menu-label">Выйти</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Нет подписки — показываем тарифы
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

        <button
          className="shop-landing__ambassador"
          onClick={() => handleTariffClick('9990')}
        >
          <span className="shop-landing__ambassador-label">АМБАССАДОР</span>
          <span className="shop-landing__ambassador-price">
            <span style={{ textDecoration: 'line-through', opacity: 0.6, marginRight: 8, fontSize: '14px' }}>9 990 ₽</span>
            {ambaPrice} ₽
          </span>
          <span className="shop-landing__ambassador-desc">Реферальная программа + все привилегии</span>
        </button>
      </div>
    </div>
  );
}

export default LandingPage;
