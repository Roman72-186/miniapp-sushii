// src/PaymentPage.js — Страница оплаты подписки

import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import './shop.css';

const PENDING_PAYMENT_KEY = 'pending_payment_check';

// Дефолтные цены (перезаписываются из API)
const DEFAULT_PRICE_TABLE = {
  '290':  { 1: 290,  3: 750,  5: 1200 },
  '490':  { 1: 690,  3: 1690, 5: 2990 },
  '1190': { 1: 1390, 3: 3850, 5: 6600 },
  '9990': { 1: 3990 },
};

const TARIFF_DATA = {
  '290': {
    price: 290,
    label: '290 ₽ / месяц',
    title: 'Скидки на меню',
    features: [
      'Скидка -30% на все роллы',
      'Скидка -20% на сеты',
    ],
  },
  '490': {
    price: 690,
    label: '690 ₽ / месяц',
    title: 'Скидки + подарочные роллы',
    features: [
      'Скидка -30% на все роллы',
      'Скидка -20% на сеты',
      'Бесплатный ролл каждые 15 дней',
      'Ролл до 620₽ — любой на выбор',
    ],
  },
  '1190': {
    price: 1390,
    label: '1390 ₽ / месяц',
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
    price: 3990,
    oldPrice: 9990,
    label: '3 990 ₽',
    title: 'Амбассадор',
    oneTime: true,
    features: [
      'Все привилегии тарифа 1190 навсегда',
      'Статус «Амбассадор» в личном кабинете',
      'Персональная реферальная ссылка',
      'Вознаграждение за каждого приглашённого друга',
      'Накопление баланса SHC за рефералов',
      'Приоритетная поддержка',
    ],
  },
};

function PaymentPage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const { telegramId, phone: userPhone, loading: userLoading } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [months, setMonths] = useState(1);
  const [priceTable, setPriceTable] = useState(DEFAULT_PRICE_TABLE);
  const [phoneInput, setPhoneInput] = useState('');
  // Проверяем что телефон российский (7XXXXXXXXXX)
  const isValidRuPhone = (() => {
    if (!userPhone) return false;
    const digits = userPhone.replace(/\D/g, '');
    if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) return true;
    if (digits.length === 10) return true;
    return false;
  })();
  const hasPhone = isValidRuPhone;

  useEffect(() => {
    fetch('/api/admin/pricing')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.pricing) {
          const table = {};
          for (const [key, val] of Object.entries(data.pricing)) {
            table[key] = val.months || { 1: val.price };
          }
          setPriceTable(table);
        }
      })
      .catch(() => {});
  }, []);

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
    // Проверяем телефон
    const phone = userPhone || phoneInput.replace(/[^\d]/g, '');
    if (!phone || phone.length < 10) {
      setError('Укажите номер телефона для чека');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const resp = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: telegramId,
          tarif: tarifKey,
          phone,
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
      sessionStorage.setItem(PENDING_PAYMENT_KEY, String(Date.now()));
      const tg = window.Telegram?.WebApp;
      if (tg?.openLink) {
        tg.openLink(data.confirmation_url);
      } else {
        window.location.href = data.confirmation_url;
      }
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
        <div className="shop-payment__error" style={{ background: 'transparent', color: '#9fb0c3', marginTop: 12 }}>
          После оплаты во внешнем браузере просто вернитесь в Telegram. Подписка обновится автоматически.
        </div>
        <div className="shop-header__center">
          <span className="shop-header__title">Оформление подписки</span>
        </div>
        <div className="shop-header__spacer" />
      </header>

      <div className="shop-payment">
        <div className="shop-payment__card">
          <div className="shop-payment__price">
            {tariff.oldPrice && (
              <span className="shop-payment__old-price" style={{ marginRight: 10 }}>
                {tariff.oldPrice.toLocaleString('ru-RU')} ₽
              </span>
            )}
            {tariff.label}
          </div>
          <h2 className="shop-payment__title">{tariff.title}</h2>

          {tarifKey === '9990' ? (
            <div className="amb-desc">
              <p className="amb-desc__intro">
                Амбассадор — это возможность зарабатывать реальные деньги, приглашая друзей в Суши-Хаус 39. Вы получаете процент с каждого платежа ваших рефералов.
              </p>

              <div className="amb-desc__level amb-desc__level--1">
                <div className="amb-desc__level-header">
                  <span className="amb-desc__level-badge amb-desc__level-badge--1">Уровень 1</span>
                  <span className="amb-desc__level-percent">30%</span>
                </div>
                <div className="amb-desc__level-text">
                  с каждого платежа приглашённых вами подписчиков
                </div>
                <div className="amb-desc__examples">
                  <div className="amb-desc__example">Друг оплатил 490 ₽ → вам <strong>147 ₽</strong></div>
                  <div className="amb-desc__example">Друг оплатил 1190 ₽ → вам <strong>357 ₽</strong></div>
                </div>
              </div>

              <div className="amb-desc__level amb-desc__level--2">
                <div className="amb-desc__level-header">
                  <span className="amb-desc__level-badge amb-desc__level-badge--2">Уровень 2</span>
                  <span className="amb-desc__level-percent">5%</span>
                </div>
                <div className="amb-desc__level-text">
                  со всех платежей подписчиков ваших амбассадоров
                </div>
                <div className="amb-desc__level-unlock">
                  Открывается после 10 приглашённых амбассадоров
                </div>
                <div className="amb-desc__examples">
                  <div className="amb-desc__example">Ваш амбассадор привёл 5 подписчиков по 490 ₽ → вам <strong>122 ₽</strong></div>
                  <div className="amb-desc__example">10 таких амбассадоров → <strong>1 225 ₽/мес</strong></div>
                </div>
              </div>

              <div className="amb-desc__perks">
                <div className="amb-desc__perk">Статус «Амбассадор» в личном кабинете</div>
                <div className="amb-desc__perk">Персональная реферальная ссылка</div>
                <div className="amb-desc__perk">Приоритетная поддержка</div>
              </div>
            </div>
          ) : (
            <ul className="shop-payment__features">
              {tariff.features.map((f, i) => (
                <li key={i} className="shop-payment__feature">
                  <span className="shop-payment__check">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>

        {!tariff.oneTime && (() => {
          const totalDiscount = priceTable[tarifKey][months];
          const totalFull = tariff.price * months;
          const hasDiscount = totalDiscount < totalFull;
          return (
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
              {hasDiscount && (
                <div className="shop-payment__discount">
                  <span className="shop-payment__old-price">{totalFull} ₽</span>
                  <span className="shop-payment__new-price">{totalDiscount} ₽</span>
                </div>
              )}
            </div>
          );
        })()}

        {!userLoading && !hasPhone && (
          <div className="shop-payment__phone">
            <label className="shop-payment__phone-label">Номер телефона (для чека)</label>
            <input
              type="tel"
              className="shop-payment__phone-input"
              placeholder="+7 (___) ___-__-__"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)}
            />
          </div>
        )}

        {error && (
          <div className="shop-payment__error">{error}</div>
        )}

        {!telegramId && !userLoading && (
          <div className="shop-payment__error">
            Откройте эту страницу через Telegram, чтобы оплатить подписку
          </div>
        )}

        <button
          className="shop-payment__btn"
          disabled={submitting || !telegramId}
          onClick={handlePay}
        >
          {submitting ? 'Переход к оплате...' : `Оплатить ${tariff.oneTime ? tariff.price : priceTable[tarifKey][months]} ₽`}
        </button>
      </div>
    </div>
  );
}

export default PaymentPage;
