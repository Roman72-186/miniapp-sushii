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
  {
    price: '9990',
    label: '9 990 \u20BD',
    desc: '\u0410\u043C\u0431\u0430\u0441\u0441\u0430\u0434\u043E\u0440',
  },
];

function LandingPage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const { telegramId, loading: userLoading, hasTag, sync } = useUser();
  const [redirecting, setRedirecting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

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
    if (hasTag('подписка30')) {
      setRedirecting(true);
      window.location.href = `/discount-shop?telegram_id=${telegramId}`;
    }
  }, [userLoading, telegramId, hasTag]);

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
        <img src="/logo.jpg" alt="\u0421\u0443\u0448\u0438-\u0425\u0430\u0443\u0441 39" className="shop-landing__logo" />
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
      </div>
    </div>
  );
}

export default LandingPage;
