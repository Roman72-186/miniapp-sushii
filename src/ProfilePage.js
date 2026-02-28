// src/ProfilePage.js — Личный кабинет /profile

import React, { useState, useEffect, useMemo } from 'react';
import './shop.css';

function ProfilePage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const telegramId = useMemo(() => {
    const tg = window.Telegram?.WebApp;
    const tgId = tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null;
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('telegram_id');
    return tgId || urlId || null;
  }, []);

  useEffect(() => {
    if (!telegramId) {
      setError('Telegram ID не найден');
      setLoading(false);
      return;
    }

    fetch('/api/get-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: telegramId }),
    })
      .then(r => {
        if (!r.ok) throw new Error('Ошибка загрузки профиля');
        return r.json();
      })
      .then(data => setProfile(data))
      .catch(err => setError(err.message || 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [telegramId]);

  const handleBack = () => {
    if (telegramId) {
      window.location.href = `/discount-shop?telegram_id=${telegramId}`;
    } else {
      window.location.href = '/discount-shop';
    }
  };

  const formatPhone = (raw) => {
    if (!raw) return '—';
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 11) {
      return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
    }
    if (digits.length === 10) {
      return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
    }
    return `+${digits}`;
  };

  return (
    <div className="shop-page">
      <header className="shop-header">
        <button className="shop-header__back" onClick={handleBack}>
          ←
        </button>
        <div className="shop-header__center">
          <span className="shop-header__title">Личный кабинет</span>
        </div>
        <div className="shop-header__spacer" />
      </header>

      {loading ? (
        <div className="shop-loading">
          <div className="shop-loading__spinner" />
          <span className="shop-loading__text">Загрузка...</span>
        </div>
      ) : error ? (
        <div className="shop-loading">
          <span className="shop-loading__text" style={{ color: '#e53935' }}>{error}</span>
        </div>
      ) : (
        <div className="shop-profile">
          <div className="shop-profile__block">
            {/* Заголовок кабинета */}
            <div className="shop-profile__header">
              🍣 КАБИНЕТ СУШИ-ХАУС 39
            </div>

            {/* Профиль */}
            <div className="shop-profile__section">
              <div className="shop-profile__row">
                <span className="shop-profile__label">👤 Профиль:</span>
                <span className="shop-profile__value">{profile?.name || '—'}</span>
              </div>
              <div className="shop-profile__row">
                <span className="shop-profile__label">📱 Контакт:</span>
                <span className="shop-profile__value">{formatPhone(profile?.phone)}</span>
              </div>
            </div>

            {/* Подписка */}
            <div className="shop-profile__section">
              <div className="shop-profile__row">
                <span className="shop-profile__label">📋 Статус подписки:</span>
                <span className="shop-profile__value">{profile?.статусСписания || '—'}</span>
              </div>
              <div className="shop-profile__row">
                <span className="shop-profile__label">🔒 Действует до:</span>
                <span className="shop-profile__value">{profile?.датаОКОНЧАНИЯ || '—'}</span>
              </div>
            </div>

            {/* Баланс */}
            <div className="shop-profile__section">
              <div className="shop-profile__row">
                <span className="shop-profile__label">Мой баланс:</span>
                <span className="shop-profile__value">{profile?.balance_shc ? `${profile.balance_shc} SHC` : '—'}</span>
              </div>
              <div className="shop-profile__hint">
                (баланс за приглашённых в бота друзей)
              </div>
            </div>

            {/* Автопродление */}
            <div className="shop-profile__section">
              <div className="shop-profile__row">
                <span className="shop-profile__label">♻️ Автопродление:</span>
                <span className="shop-profile__value">{profile?.статусСписания || '—'}</span>
              </div>
              <div className="shop-profile__row">
                <span className="shop-profile__label">💳 Способ оплаты:</span>
                <span className="shop-profile__value">Юкасса</span>
              </div>
            </div>

            {/* Часы работы */}
            <div className="shop-profile__section">
              <div className="shop-profile__row">
                <span className="shop-profile__label">⏰ Принимаем заказы</span>
              </div>
              <div className="shop-profile__row">
                <span className="shop-profile__value">с 10:00 до 21:50</span>
              </div>
            </div>

            {/* Поддержка */}
            <div className="shop-profile__section">
              <div className="shop-profile__note">
                💬 Если возникают сложности — смело пишите в поддержку бота. Мы всегда на связи и поможем разобраться!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
