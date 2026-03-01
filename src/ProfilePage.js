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
  const [referrals, setReferrals] = useState(null); // null = ещё грузится

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
      .then(data => {
        setProfile(data);
        // Загружаем рефералов отдельно (не блокируя UI)
        if (data.contact_id) {
          fetch('/api/get-referrals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact_id: data.contact_id }),
          })
            .then(r => r.ok ? r.json() : null)
            .then(refData => setReferrals(refData || { referrals_count: 0, referrals_top10: [] }))
            .catch(() => setReferrals({ referrals_count: 0, referrals_top10: [] }));
        } else {
          setReferrals({ referrals_count: 0, referrals_top10: [] });
        }
      })
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

            {/* Рефералы */}
            <div className="shop-profile__section">
              <div className="shop-profile__row">
                <span className="shop-profile__label">👥 Приглашённые друзья:</span>
                {referrals === null ? (
                  <span className="shop-profile__value" style={{ color: '#666' }}>...</span>
                ) : (
                  <span
                    className="shop-profile__value shop-profile__referrals-count"
                    onClick={() => {
                      const list = referrals?.referrals_top10 || [];
                      if (list.length === 0) {
                        alert('У вас пока нет приглашённых друзей');
                        return;
                      }
                      const names = list.map((r, i) => `${i + 1}. ${r.name}`).join('\n');
                      const total = referrals?.referrals_count || 0;
                      const header = total > 10
                        ? `Первые 10 из ${total} приглашённых:`
                        : `Ваши приглашённые (${total}):`;
                      alert(`${header}\n\n${names}`);
                    }}
                  >
                    {referrals?.referrals_count ?? 0}
                  </span>
                )}
              </div>
              <button
                className="shop-profile__invite-btn"
                onClick={() => {
                  const refLink = `https://t.me/sushihouse39_bot?start=ref_${telegramId}`;
                  const text = 'Привет! Присоединяйся к Суши-Хаус 39 — вкусные роллы со скидкой по подписке 🍣';
                  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(text)}`;
                  window.open(shareUrl, '_blank');
                }}
              >
                🔗 Пригласить друга
              </button>
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
