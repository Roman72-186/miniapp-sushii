// src/components/SubCheckoutModal.js — Модалка оформления заказа по подписке (только самовывоз)

import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '../UserContext';
import { isShopOpen } from '../utils/timeUtils';
import { normalizePhone } from '../utils/phone';
import { PICKUP_POINTS } from '../config/pickupPoints';

function SubCheckoutModal({ product, telegramId, contactId, onClose, onSuccess }) {
  const { listItemName, phone: userPhone, sync } = useUser();
  const [pickupPoint, setPickupPoint] = useState(PICKUP_POINTS[0].id);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const shopOpen = useMemo(() => isShopOpen(), []);

  // Автозаполнение из контекста пользователя
  useEffect(() => {
    if (listItemName && !name) setName(listItemName);
    if (userPhone && !phone) setPhone(normalizePhone(userPhone));
  }, [listItemName, userPhone]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPickup = PICKUP_POINTS.find(p => p.id === pickupPoint);

  if (!shopOpen) {
    return (
      <>
        <div className="shop-cart-overlay" onClick={onClose} />
        <div className="shop-checkout" style={{ zIndex: 202 }}>
          <div className="shop-checkout__inner">
            <div className="shop-checkout__header">
              <button type="button" className="shop-checkout__back" onClick={onClose}>←</button>
              <h2 className="shop-checkout__title">Оформление</h2>
            </div>
            <div className="shop-checkout__closed">
              <div className="shop-checkout__closed-icon">🕐</div>
              <div className="shop-checkout__closed-title">Приём заказов закрыт</div>
              <div className="shop-checkout__closed-text">Заказы принимаются ежедневно с 10:00 до 21:50 (Калининград)</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim()) { setError('Укажите имя'); return; }
    if (!phone.trim()) { setError('Укажите телефон'); return; }

    const finalPhone = normalizePhone(phone.trim());
    if (!/^7\d{10}$/.test(finalPhone)) {
      setError('Телефон должен быть в формате +7XXXXXXXXXX');
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: [{
            id: product.frontpadId || product.sku || product.id,
            product_id: product.id,
            quantity: 1,
            name: product.name,
            price: 0,
          }],
          client: {
            name: name.trim(),
            phone: finalPhone,
            street: selectedPickup.address,
            home: '',
            apart: '',
            pod: '',
            et: '',
          },
          payment: 'cash',
          delivery_type: 'pickup',
          affiliate: selectedPickup.affiliate,
          pickup_point_id: selectedPickup.id,
          pickup_point_address: selectedPickup.address,
          datetime: '',
          comment: `Подписка — ${product.name} | Самовывоз: ${selectedPickup.address}`,
          telegram_id: telegramId || '',
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка создания заказа');
      }

      // Mark gift window as claimed
      if (telegramId) {
        try {
          await fetch('/api/claim-gift', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: telegramId, contact_id: contactId }),
          });
        } catch (_) { /* не блокируем успех заказа */ }
        sync(true);
      }

      onSuccess(data.orderNumber || data.orderId || '');
    } catch (err) {
      setError(err.message || 'Не удалось отправить заказ');
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="shop-cart-overlay" onClick={onClose} />
      <div className="shop-checkout" style={{ zIndex: 202 }}>
        <div className="shop-checkout__inner">
          <div className="shop-checkout__header">
            <button type="button" className="shop-checkout__back" onClick={onClose}>
              ←
            </button>
            <h2 className="shop-checkout__title">Оформление</h2>
          </div>

          {/* Выбранный товар */}
          <div className="shop-form-section">
            <h3 className="shop-form-section__title">Ваш выбор</h3>
            <div className="shop-form-section__block" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src={product.image}
                alt={product.name}
                style={{ width: 60, height: 44, borderRadius: 8, objectFit: 'cover' }}
                onError={e => { e.target.src = '/logo.jpg'; }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{product.name}</div>
                <div style={{ color: '#3CC8A1', fontSize: 13, marginTop: 2 }}>Подарок по подписке</div>
              </div>
            </div>
          </div>

          {/* Пункт самовывоза */}
          <div className="shop-form-section">
            <h3 className="shop-form-section__title">Пункт самовывоза</h3>
            <div className="shop-form-section__block">
              <div className="shop-radio-group">
                {PICKUP_POINTS.map(point => (
                  <label key={point.id} className="shop-radio-label">
                    <input
                      type="radio"
                      name="pickup"
                      checked={pickupPoint === point.id}
                      onChange={() => setPickupPoint(point.id)}
                    />
                    <div>
                      <div>{point.address}</div>
                      <div className="shop-radio-hint">{point.hours}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Контактная информация */}
          <div className="shop-form-section">
            <h3 className="shop-form-section__title">Контактные данные</h3>
            <div className="shop-form-section__block">
              <div className="shop-form-row">
                <div className="shop-form-field">
                  <label className="shop-form-field__label">Имя</label>
                  <input
                    className="shop-form-field__input"
                    type="text"
                    placeholder="Имя"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <div className="shop-form-field">
                  <label className="shop-form-field__label">Телефон</label>
                  <input
                    className="shop-form-field__input"
                    type="tel"
                    placeholder="+7XXXXXXXXXX"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onBlur={() => { if (phone.trim()) setPhone(normalizePhone(phone.trim())); }}
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ color: '#e53935', textAlign: 'center', marginBottom: 12, fontSize: 14 }}>
              {error}
            </div>
          )}
        </div>

        {/* Фиксированный футер */}
        <div className="shop-checkout__footer">
          <div className="shop-checkout__footer-inner">
            <div className="shop-checkout__summary">
              <div>Самовывоз: <span className="shop-checkout__summary-total">{selectedPickup?.address}</span></div>
            </div>
            <button
              className="shop-checkout__submit"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Отправка...' : 'ПОДТВЕРДИТЬ'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default SubCheckoutModal;
