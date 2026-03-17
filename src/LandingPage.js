// src/LandingPage.js — Посадочная страница с тарифами

import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import './shop.css';
import BrandLoader from './components/BrandLoader';

const TARIFFS = [
  {
    price: '290',
    label: '290 \u20BD / \u043C\u0435\u0441\u044F\u0446',
    desc: '\u0421\u043A\u0438\u0434\u043A\u0438 \u043D\u0430 \u043C\u0435\u043D\u044E',
  },
  {
    price: '490',
    label: '490 \u20BD / \u043C\u0435\u0441\u044F\u0446',
    desc: '\u0421\u043A\u0438\u0434\u043A\u0438 + \u043F\u043E\u0434\u0430\u0440\u043E\u0447\u043D\u044B\u0435 \u0440\u043E\u043B\u043B\u044B',
  },
  {
    price: '1190',
    label: '1190 \u20BD / \u043C\u0435\u0441\u044F\u0446',
    desc: '\u0421\u043A\u0438\u0434\u043A\u0438 + \u0440\u043E\u043B\u043B\u044B + \u0441\u0435\u0442\u044B + VIP-\u0434\u043E\u0441\u0442\u0443\u043F',
  },
];

function LandingPage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const { telegramId, loading: userLoading, tarif, sync } = useUser();
  const [redirecting, setRedirecting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [ambaPrice, setAmbaPrice] = useState('9 990');

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
      // Убираем параметр из URL без перезагрузки
      params.delete('payment');
      const cleanUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname + (params.get('telegram_id') ? `?telegram_id=${params.get('telegram_id')}` : '');
      window.history.replaceState({}, '', cleanUrl);
      // Принудительно обновляем кэш — webhook мог уже добавить теги
      sync(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userLoading || !telegramId) return;
    // Есть активный тариф — редирект в магазин со скидками
    if (tarif && ['290', '490', '1190', '9990'].includes(tarif)) {
      setRedirecting(true);
      window.location.href = `/discount-shop?telegram_id=${telegramId}`;
    }
  }, [userLoading, telegramId, tarif]);

  const handleTariffClick = (price) => {
    const tid = telegramId ? `?telegram_id=${telegramId}` : '';
    window.location.href = `/pay/${price}${tid}`;
  };

  if (userLoading || redirecting) {
    return (
      <div className="shop-page">
        <BrandLoader text="Проверяем подписку" />
      </div>
    );
  }

  return (
    <div className="shop-page">
      {paymentSuccess && (
        <div className="shop-toast shop-toast--success">
          Оплата прошла успешно! Подписка оформляется...
        </div>
      )}
      <div className="shop-landing">
        <img src="/logo.jpg" alt="\u0421\u0443\u0448\u0438-\u0425\u0430\u0443\u0441 39" className="shop-landing__logo" onClick={handleLogoClick} style={{ cursor: 'default' }} />
        <h1 className="shop-landing__title">{'\u0421\u0423\u0428\u0418-\u0425\u0410\u0423\u0421 39'}</h1>
        <p className="shop-landing__subtitle">{'\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u0441\u043E \u0441\u043A\u0438\u0434\u043A\u0430\u043C\u0438 \u0438 \u043F\u043E\u0434\u0430\u0440\u043A\u0430\u043C\u0438'}</p>

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
          <span className="shop-landing__ambassador-price">{ambaPrice} ₽</span>
          <span className="shop-landing__ambassador-desc">Реферальная программа + все привилегии</span>
        </button>
      </div>
    </div>
  );
}

export default LandingPage;
