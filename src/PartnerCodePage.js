// src/PartnerCodePage.js — Ввод партнёрского кода после покупки подписки

import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import './shop.css';

function PartnerCodePage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const { telegramId, profile, sync, loading } = useUser();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null); // { partner_name, shc_awarded }
  const [synced, setSynced] = useState(false);

  // Принудительная синхронизация для подтверждения подписки
  useEffect(() => {
    if (telegramId && !synced) {
      sync(true).then(() => setSynced(true));
    }
    if (!telegramId && !loading) setSynced(true);
  }, [telegramId, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Если invited_by уже установлен — редирект в магазин
  useEffect(() => {
    if (synced && profile?.invited_by) {
      goToShop();
    }
  }, [synced, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToShop = () => {
    const tid = telegramId ? `?telegram_id=${telegramId}` : '';
    window.location.href = `/discount-shop${tid}`;
  };

  const handleSubmit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError('Введите код'); return; }
    if (!telegramId) { setError('Не удалось определить пользователя'); return; }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/apply-partner-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: telegramId, code: trimmed }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Не удалось применить код');
        setSubmitting(false);
        return;
      }

      setSuccess(data);
      // Через 2 секунды переходим в магазин
      setTimeout(goToShop, 2000);
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.');
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="shop-page">
        <div className="partner-code-page">
          <div className="partner-code-page__success">
            <div className="partner-code-page__success-icon">🎉</div>
            <div className="partner-code-page__success-title">Код применён!</div>
            <div className="partner-code-page__success-text">
              Вы присоединились по приглашению от <strong>{success.partner_name}</strong>
            </div>
            {success.shc_awarded > 0 && (
              <div className="partner-code-page__success-shc">
                Партнёру начислено <strong>{success.shc_awarded} SHC</strong>
              </div>
            )}
            <div className="partner-code-page__success-hint">Переходим в магазин...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-page">
      <div className="partner-code-page">
        <img src="/logo.jpg" alt="Суши-Хаус 39" className="partner-code-page__logo" />

        <div className="partner-code-page__check">✅ Подписка оформлена!</div>

        <h2 className="partner-code-page__title">Вас кто-то пригласил?</h2>
        <p className="partner-code-page__subtitle">
          Введите код партнёра, чтобы поблагодарить его — он получит бонусные SHC баллы
        </p>

        <div className="partner-code-page__input-wrap">
          <input
            className="partner-code-page__input"
            type="text"
            maxLength={8}
            placeholder="ABCD12"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </div>

        {error && (
          <div className="partner-code-page__error">{error}</div>
        )}

        <button
          className="partner-code-page__btn partner-code-page__btn--primary"
          disabled={submitting || !code.trim()}
          onClick={handleSubmit}
        >
          {submitting ? 'Применяем...' : 'Применить код'}
        </button>

        <button
          className="partner-code-page__btn partner-code-page__btn--skip"
          onClick={goToShop}
        >
          Пропустить →
        </button>
      </div>
    </div>
  );
}

export default PartnerCodePage;
