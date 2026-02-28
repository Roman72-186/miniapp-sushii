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
        <div className="shop-profile-cards">
          <div className="shop-profile-card">
            <div className="shop-profile-label">Статус списания</div>
            <div className="shop-profile-value">{profile?.статусСписания || '—'}</div>
          </div>
          <div className="shop-profile-card">
            <div className="shop-profile-label">Баланс</div>
            <div className="shop-profile-value">{profile?.balance_shc || '—'}</div>
          </div>
          <div className="shop-profile-card">
            <div className="shop-profile-label">Дата окончания</div>
            <div className="shop-profile-value">{profile?.датаОКОНЧАНИЯ || '—'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
