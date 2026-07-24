// src/PaymentPage.js — Страница оплаты подписки

import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { TARIFF_DATA } from './config/tariffs';
import { usePricing } from './hooks/usePricing';
import { getAttributionForRequest } from './analytics/attribution';
import { reachGoal, YM_GOALS } from './analytics/metrika';
import { getAuthHeader } from './utils/webAuth';
import { normalizePhone } from './utils/phone';
import './shop.css';

const PENDING_PAYMENT_KEY = 'pending_payment_check';

function PaymentPage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const { telegramId, phone: userPhone, loading: userLoading } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [months, setMonths] = useState(() => {
    const m = Number(new URLSearchParams(window.location.search).get('months'));
    return [1, 3, 5].includes(m) ? m : 1;
  });
  const priceTable = usePricing();
  const [nameInput, setNameInput] = useState('');
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
    const name = nameInput.trim();
    if (!telegramId && !name) {
      setError('Укажите имя для оформления подписки');
      return;
    }

    // Проверяем телефон
    const phone = userPhone || normalizePhone(phoneInput);
    if (!phone || phone.length < 10) {
      setError('Укажите номер телефона для чека');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const resp = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          telegram_id: telegramId,
          tarif: tarifKey,
          phone,
          ...(!telegramId ? { name } : {}),
          ...(tariff.oneTime ? {} : { months }),
          attribution: getAttributionForRequest(),
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
      reachGoal(YM_GOALS.PAYMENT_REDIRECT, {
        tariff: tarifKey,
        months: tariff.oneTime ? 1 : months,
        value: priceTable?.[tarifKey]?.[tariff.oneTime ? 1 : months] || undefined,
      });
      window.location.assign(data.confirmation_url);
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

        {!userLoading && !telegramId && (
          <div className="shop-payment__phone">
            <label className="shop-payment__phone-label">Имя</label>
            <input
              type="text"
              className="shop-payment__phone-input"
              placeholder="Как к вам обращаться?"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              autoComplete="name"
            />
          </div>
        )}

        {!userLoading && !hasPhone && (
          <div className="shop-payment__phone">
            <label className="shop-payment__phone-label">Номер телефона (для чека)</label>
            <input
              type="tel"
              className="shop-payment__phone-input"
              placeholder="+7 (___) ___-__-__"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)}
              autoComplete="tel"
            />
          </div>
        )}

        {error && (
          <div className="shop-payment__error">{error}</div>
        )}

        <button
          className="shop-payment__btn"
          disabled={submitting || userLoading}
          onClick={handlePay}
        >
          {submitting ? 'Переход к оплате...' : `Оплатить ${tariff.oneTime ? tariff.price : priceTable[tarifKey][months]} ₽`}
        </button>
      </div>
    </div>
  );
}

export default PaymentPage;
