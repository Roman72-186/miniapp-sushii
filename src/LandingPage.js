// src/LandingPage.js — Посадочная страница с тарифами

import React, { useState, useEffect, useMemo } from 'react';
import './shop.css';

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

  const [loading, setLoading] = useState(true);

  const telegramId = useMemo(() => {
    const tg = window.Telegram?.WebApp;
    const tgId = tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null;
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('telegram_id');
    return tgId || urlId || null;
  }, []);

  useEffect(() => {
    if (!telegramId) {
      setLoading(false);
      return;
    }

    fetch('/api/check-tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: telegramId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.hasTag) {
          window.location.href = `/discount-shop?telegram_id=${telegramId}`;
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, [telegramId]);

  const handleTariffClick = () => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.openLink('https://watbot.ru/w/BnjZ');
      tg.close();
    } else {
      window.open('https://watbot.ru/w/BnjZ', '_blank');
    }
  };

  if (loading) {
    return (
      <div className="shop-page">
        <div className="shop-loading">
          <div className="shop-loading__spinner" />
          <div className="shop-loading__text">{'\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-page">
      <div className="shop-landing">
        <img src="/logo.jpg" alt="\u0421\u0443\u0448\u0438-\u0425\u0430\u0443\u0441 39" className="shop-landing__logo" />
        <h1 className="shop-landing__title">{'\u0421\u0423\u0428\u0418-\u0425\u0410\u0423\u0421 39'}</h1>
        <p className="shop-landing__subtitle">{'\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u0441\u043E \u0441\u043A\u0438\u0434\u043A\u0430\u043C\u0438 \u0438 \u043F\u043E\u0434\u0430\u0440\u043A\u0430\u043C\u0438'}</p>

        <div className="shop-landing__cards">
          {TARIFFS.map(t => (
            <button
              key={t.price}
              className="shop-landing__card"
              onClick={handleTariffClick}
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
