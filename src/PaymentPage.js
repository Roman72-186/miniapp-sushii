// src/PaymentPage.js — Страница оплаты подписки

import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import './shop.css';

const TARIFF_DATA = {
  '290': {
    price: 290,
    label: '290 ₽ / месяц',
    title: 'Скидки на меню',
    features: [
      'Скидка -30% на все роллы',
      'Скидка -20% на сеты',
    ],
    // TODO: описание, ссылка оплаты — будет предоставлено
  },
  '490': {
    price: 490,
    label: '490 ₽ / месяц',
    title: 'Скидки + подарочные роллы',
    features: [
      'Скидка -30% на все роллы',
      'Скидка -20% на сеты',
      'Бесплатный ролл каждые 15 дней',
    ],
    // TODO: описание, ссылка оплаты — будет предоставлено
  },
  '1190': {
    price: 1190,
    label: '1190 ₽ / месяц',
    title: 'Скидки + роллы + сеты + VIP',
    features: [
      'Скидка -30% на все роллы',
      'Скидка -20% на сеты',
      'Бесплатный сет каждые 30 дней',
      'Доступ в VIP-клуб',
      'Бесплатный кофе к каждому заказу',
    ],
  },
  '9990': {
    price: 9990,
    label: '9 990 ₽',
    title: 'Амбассадор',
    oneTime: true,
    features: [
      'Всё из тарифа 1190',
      'Статус Амбассадор',
    ],
  },
};

function PaymentPage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const { telegramId } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [months, setMonths] = useState(1);

  // Определяем тариф из URL: /pay/290, /pay/490, /pay/1190
  const path = window.location.pathname;
  const tarifKey = path.replace('/pay/', '').replace('/', '');
  const tariff = TARIFF_DATA[tarifKey];

  if (!tariff) {
    return (
      <div className="shop-page">
        <div className="shop-loading">
          <span className="shop-loading__text" style={{ color: '#e53935' }}>Тариф не найден</span>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    const tid = telegramId ? `?telegram_id=${telegramId}` : '';
    window.location.href = `/${tid}`;
  };

  const handlePay = async () => {
    setSubmitting(true);
    setError('');

    try {
      const resp = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: telegramId,
          tarif: tarifKey,
          ...(tariff.oneTime ? {} : { months }),
        }),
      });

      const data = await resp.json();

      if (!resp.ok || !data.confirmation_url) {
        setError(data.error || 'Не удалось создать платёж');
        setSubmitting(false);
        return;
      }

      // Редирект на страницу оплаты YooKassa
      window.location.href = data.confirmation_url;
    } catch (err) {
      setError('Ошибка сети. Проверьте подключение и попробуйте снова.');
      setSubmitting(false);
    }
  };

  return (
    <div className="shop-page">
      <header className="shop-header">
        <button className="shop-header__back" onClick={handleBack}>
          ←
        </button>
        <div className="shop-header__center">
          <span className="shop-header__title">Оформление подписки</span>
        </div>
        <div className="shop-header__spacer" />
      </header>

      <div className="shop-payment">
        <div className="shop-payment__card">
          <div className="shop-payment__price">{tariff.label}</div>
          <h2 className="shop-payment__title">{tariff.title}</h2>

          <ul className="shop-payment__features">
            {tariff.features.map((f, i) => (
              <li key={i} className="shop-payment__feature">
                <span className="shop-payment__check">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {!tariff.oneTime && (
          <div className="shop-payment__months">
            <div className="shop-payment__months-label">Срок подписки</div>
            <div className="shop-payment__months-options">
              {[1, 3, 5].map(m => (
                <button
                  key={m}
                  className={'shop-payment__month-btn' + (months === m ? ' shop-payment__month-btn--active' : '')}
                  onClick={() => setMonths(m)}
                >
                  {m} {m === 1 ? 'месяц' : m < 5 ? 'месяца' : 'месяцев'}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="shop-payment__error">{error}</div>
        )}

        <button
          className="shop-payment__btn"
          disabled={submitting || !telegramId}
          onClick={handlePay}
        >
          {submitting ? 'Переход к оплате...' : `Оплатить ${tariff.oneTime ? tariff.price : tariff.price * months} ₽`}
        </button>
      </div>
    </div>
  );
}

export default PaymentPage;
