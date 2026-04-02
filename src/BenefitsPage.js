// src/BenefitsPage.js — Страница выгоды подписки (для входящего трафика из уведомлений)

import React, { useEffect } from 'react';
import './shop.css';

const ROLL_EXAMPLES = [
  { name: 'Калифорния', price: 390 },
  { name: 'Аляска Кунсей', price: 560 },
  { name: 'Бархатный тунец', price: 600 },
  { name: 'Благородный Сёгун', price: 610 },
  { name: 'Авокадо маки', price: 340 },
];

const SET_EXAMPLES = [
  { name: 'Сет Домино', price: 2030 },
  { name: 'Сет Дамский угодник', price: 1930 },
  { name: 'Сет Джуниор', price: 1680 },
];

const TARIFFS = [
  {
    price: '290',
    label: '290 ₽ / мес',
    title: 'Скидки',
    perks: ['−30% на все роллы', '−20% на все сеты'],
    accent: '#9fb0c3',
  },
  {
    price: '490',
    label: '690 ₽ / мес',
    title: 'Скидки + Роллы',
    perks: ['−30% на все роллы', '−20% на все сеты', 'Бесплатный ролл каждые 15 дней', 'Ролл до 620₽ — любой на выбор'],
    accent: '#3CC8A1',
    featured: true,
  },
  {
    price: '1190',
    label: '1390 ₽ / мес',
    title: 'Скидки + Сеты',
    perks: ['−30% на все роллы', '−20% на все сеты', 'Бесплатный сет каждые 30 дней', 'Сет до 2000₽ — любой на выбор', 'Бесплатный кофе к заказу'],
    accent: '#f5923a',
  },
];

function BenefitsPage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const params = new URLSearchParams(window.location.search);
  const telegramId = params.get('telegram_id');
  const tid = telegramId ? `?telegram_id=${telegramId}` : '';

  const handleTariff = (price) => {
    window.location.href = `/pay/${price}${tid}`;
  };

  return (
    <div className="shop-page">
      <div className="benefits-page">

        {/* Шапка */}
        <div className="benefits-header">
          <img src="/logo.jpg" alt="Суши-Хаус 39" className="benefits-header__logo" />
          <h1 className="benefits-header__title">СУШИ-ХАУС 39</h1>
          <p className="benefits-header__subtitle">Подписка со скидками и подарками</p>
        </div>

        {/* Блок сравнения цен — роллы */}
        <div className="benefits-section">
          <div className="benefits-section__title">Роллы: скидка −30%</div>
          <div className="benefits-price-list">
            {ROLL_EXAMPLES.map(item => {
              const discounted = Math.round(item.price * 0.70);
              return (
                <div key={item.name} className="benefits-price-row">
                  <span className="benefits-price-row__name">{item.name}</span>
                  <span className="benefits-price-row__prices">
                    <span className="benefits-price-row__old">{item.price}₽</span>
                    <span className="benefits-price-row__arrow">→</span>
                    <span className="benefits-price-row__new">{discounted}₽</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Блок сравнения цен — сеты */}
        <div className="benefits-section">
          <div className="benefits-section__title">Сеты: скидка −20%</div>
          <div className="benefits-price-list">
            {SET_EXAMPLES.map(item => {
              const discounted = Math.round(item.price * 0.80);
              return (
                <div key={item.name} className="benefits-price-row">
                  <span className="benefits-price-row__name">{item.name}</span>
                  <span className="benefits-price-row__prices">
                    <span className="benefits-price-row__old">{item.price}₽</span>
                    <span className="benefits-price-row__arrow">→</span>
                    <span className="benefits-price-row__new">{discounted}₽</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Реферальная программа */}
        <div className="benefits-section benefits-section--accent">
          <div className="benefits-section__title">Реферальная программа</div>
          <div className="benefits-referral">
            <div className="benefits-referral__step">
              <span className="benefits-referral__num">1</span>
              <span>Пригласи друга по своей ссылке</span>
            </div>
            <div className="benefits-referral__step">
              <span className="benefits-referral__num">2</span>
              <span>Когда он оплатит подписку — тебе начисляется <strong>20% от суммы</strong> в SHC баллах</span>
            </div>
            <div className="benefits-referral__step">
              <span className="benefits-referral__num">3</span>
              <span>SHC баллами оплачивай <strong>до 100%</strong> своего заказа</span>
            </div>
            <div className="benefits-referral__example">
              Друг оплатил подписку 1390₽ → тебе <strong>278 SHC = 278₽</strong> на заказ
            </div>
          </div>
        </div>

        {/* Тарифы */}
        <div className="benefits-section">
          <div className="benefits-section__title">Выбери тариф</div>
          <div className="benefits-tariffs">
            {TARIFFS.map(t => (
              <div key={t.price} className={`benefits-tariff${t.featured ? ' benefits-tariff--featured' : ''}`}>
                <div className="benefits-tariff__price" style={{ color: t.accent }}>{t.label}</div>
                <div className="benefits-tariff__title">{t.title}</div>
                <ul className="benefits-tariff__perks">
                  {t.perks.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
                <button
                  className="benefits-tariff__btn"
                  style={{ background: t.accent }}
                  onClick={() => handleTariff(t.price)}
                >
                  Оформить
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default BenefitsPage;
