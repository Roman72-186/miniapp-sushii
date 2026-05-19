import React, { useEffect, useMemo, useState } from 'react';
import { TARIFF_DATA, getTariffMonthPrice, PUBLIC_TARIFF_IDS } from '../config/tariffs';
import { usePricing } from '../hooks/usePricing';
import { normalizePhone } from '../utils/phone';

const PENDING_PAYMENT_KEY = 'pending_payment_check';

function SubscriptionRequiredModal({ isOpen, onClose }) {
  const pricing = usePricing();
  const [selectedTariff, setSelectedTariff] = useState('490');
  const [step, setStep] = useState('tariffs');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pdnConsent, setPdnConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) setError('');
  }, [isOpen]);

  const selectedPrice = useMemo(
    () => getTariffMonthPrice(pricing, selectedTariff, 1),
    [pricing, selectedTariff]
  );

  if (!isOpen) return null;

  const handleLogin = () => {
    window.location.href = '/login?return_to=/discount-shop';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const normalizedPhone = normalizePhone(phone);
    if (!name.trim()) {
      setError('Укажите имя');
      return;
    }
    if (!/^7\d{10}$/.test(normalizedPhone)) {
      setError('Введите корректный номер телефона');
      return;
    }
    if (!pdnConsent) {
      setError('Подтвердите согласие на обработку персональных данных');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tarif: selectedTariff,
          months: 1,
          name: name.trim(),
          phone: normalizedPhone,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.confirmation_url) {
        throw new Error(data.error || 'Не удалось создать платёж');
      }

      sessionStorage.setItem(PENDING_PAYMENT_KEY, String(Date.now()));
      window.location.href = data.confirmation_url;
    } catch (err) {
      setError(err.message || 'Ошибка оплаты. Попробуйте ещё раз.');
      setLoading(false);
    }
  };

  return (
    <>
      <div className="shop-locked-overlay" onClick={loading ? undefined : onClose} />
      <div className="pf-modal" role="dialog" aria-modal="true" aria-label="Оформление подписки">
        <div className="pf-modal__title">Оформите подписку</div>
        <div className="pf-modal__subtitle">
          Меню можно смотреть бесплатно. Для заказа нужна активная подписка.
        </div>

        {step === 'tariffs' ? (
          <>
            {PUBLIC_TARIFF_IDS.map(tariffId => {
              const tariff = TARIFF_DATA[tariffId];
              const price = getTariffMonthPrice(pricing, tariffId, 1);
              return (
                <button
                  key={tariffId}
                  type="button"
                  className={`pf-modal__tariff-btn${tariffId === selectedTariff ? ' pf-modal__tariff-btn--best' : ''}`}
                  onClick={() => setSelectedTariff(tariffId)}
                >
                  <div className="pf-modal__tariff-row">
                    <span className="pf-modal__tariff-name">{price} ₽ / месяц</span>
                    {tariff.badge && <span className="pf-modal__tariff-star">{tariff.badge}</span>}
                  </div>
                  <div className="pf-modal__tariff-desc">{tariff.title}. {tariff.desc}</div>
                </button>
              );
            })}

            <button
              type="button"
              className="shop-payment__btn"
              onClick={() => setStep('contacts')}
            >
              Продолжить за {selectedPrice} ₽
            </button>
            <button type="button" className="partner-code-page__btn partner-code-page__btn--skip" onClick={onClose}>
              Пока только смотрю
            </button>
            <button type="button" className="partner-code-page__btn partner-code-page__btn--skip" onClick={handleLogin}>
              Уже есть подписка? Войти
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="shop-form-field">
              <label className="shop-form-field__label">Имя</label>
              <input
                className="shop-form-field__input"
                type="text"
                value={name}
                onChange={event => setName(event.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            <div className="shop-form-field">
              <label className="shop-form-field__label">Телефон</label>
              <input
                className="shop-form-field__input"
                type="tel"
                inputMode="tel"
                placeholder="+7 (___) ___-__-__"
                value={phone}
                onChange={event => setPhone(event.target.value)}
                disabled={loading}
              />
            </div>

            <label style={{ display: 'flex', gap: 10, color: '#71717A', fontSize: 12, lineHeight: 1.45, margin: '8px 0 14px' }}>
              <input
                type="checkbox"
                checked={pdnConsent}
                onChange={event => setPdnConsent(event.target.checked)}
                disabled={loading}
                style={{ marginTop: 2, accentColor: '#3CC8A1' }}
              />
              <span>
                Я согласен(а) с обработкой персональных данных и политикой конфиденциальности.
              </span>
            </label>

            {error && <div className="shop-payment__error">{error}</div>}

            <button type="submit" className="shop-payment__btn" disabled={loading}>
              {loading ? 'Переходим к оплате...' : `Оплатить ${selectedPrice} ₽`}
            </button>
            <button
              type="button"
              className="partner-code-page__btn partner-code-page__btn--skip"
              onClick={() => setStep('tariffs')}
              disabled={loading}
            >
              Назад к тарифам
            </button>
          </form>
        )}
      </div>
    </>
  );
}

export default SubscriptionRequiredModal;
