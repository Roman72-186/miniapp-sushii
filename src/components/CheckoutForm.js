// src/components/CheckoutForm.js — Форма оформления заказа (тёмная тема)

import React, { useState } from 'react';

const PICKUP_POINTS = [
  { id: '1', address: 'ул. Ю.Гагарина, д. 16Б', hours: '10:00–22:00', affiliate: '184' },
  { id: '2', address: 'ул. Согласия, д. 46', hours: '10:00–22:00', affiliate: '435' },
  { id: '3', address: 'ул. Автомобильная, д. 12Б', hours: '10:00–22:00', affiliate: '457' },
  { id: '4', address: 'Гурьевск', hours: '10:00–22:00', affiliate: '396' },
];

function CheckoutForm({ items, total, telegramId, onBack, onSuccess }) {
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [pickupPoint, setPickupPoint] = useState(PICKUP_POINTS[0].id);
  const [timeType, setTimeType] = useState('asap');
  const [payment, setPayment] = useState('cash');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [home, setHome] = useState('');
  const [apart, setApart] = useState('');
  const [pod, setPod] = useState('');
  const [et, setEt] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const selectedPickup = PICKUP_POINTS.find(p => p.id === pickupPoint);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Укажите имя'); return; }
    if (!phone.trim()) { setError('Укажите телефон'); return; }
    if (deliveryType === 'delivery' && !street.trim()) { setError('Укажите улицу'); return; }

    setSubmitting(true);

    try {
      const pickupAddress = selectedPickup ? selectedPickup.address : '';

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: items.map(item => ({
            id: item.product.id,
            quantity: item.quantity,
            name: item.product.cleanName || item.product.name,
            price: item.product.price,
          })),
          client: {
            name: name.trim(),
            phone: phone.trim(),
            street: deliveryType === 'delivery' ? street.trim() : pickupAddress,
            home: deliveryType === 'delivery' ? home.trim() : '',
            apart: deliveryType === 'delivery' ? apart.trim() : '',
            pod: deliveryType === 'delivery' ? pod.trim() : '',
            et: deliveryType === 'delivery' ? et.trim() : '',
          },
          payment,
          delivery_type: deliveryType,
          affiliate: deliveryType === 'pickup' ? selectedPickup?.affiliate || '' : '',
          comment: [
            comment.trim(),
            deliveryType === 'pickup' ? `Самовывоз: ${pickupAddress}` : '',
          ].filter(Boolean).join(' | '),
          telegram_id: telegramId || '',
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка создания заказа');
      }

      onSuccess(data.orderNumber || data.orderId);
    } catch (err) {
      setError(err.message || 'Не удалось отправить заказ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="shop-checkout">
      <form className="shop-checkout__inner" onSubmit={handleSubmit}>
        <div className="shop-checkout__header">
          <button type="button" className="shop-checkout__back" onClick={onBack}>
            ←
          </button>
          <h2 className="shop-checkout__title">Оформление заказа</h2>
        </div>

        {/* Способ получения */}
        <div className="shop-form-section">
          <h3 className="shop-form-section__title">Способ получения заказа</h3>
          <div className="shop-form-section__block">
            <div className="shop-radio-group">
              <label className="shop-radio-label">
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryType === 'delivery'}
                  onChange={() => setDeliveryType('delivery')}
                />
                Доставка
              </label>
              <label className="shop-radio-label">
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryType === 'pickup'}
                  onChange={() => setDeliveryType('pickup')}
                />
                Самовывоз
              </label>
            </div>
          </div>
        </div>

        {/* Пункт самовывоза */}
        {deliveryType === 'pickup' && (
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
        )}

        {/* Время */}
        <div className="shop-form-section">
          <h3 className="shop-form-section__title">Время получения заказа</h3>
          <div className="shop-form-section__block">
            <div className="shop-radio-group">
              <label className="shop-radio-label">
                <input
                  type="radio"
                  name="time"
                  checked={timeType === 'asap'}
                  onChange={() => setTimeType('asap')}
                />
                Как можно скорей
              </label>
              <label className="shop-radio-label">
                <input
                  type="radio"
                  name="time"
                  checked={timeType === 'scheduled'}
                  onChange={() => setTimeType('scheduled')}
                />
                Ко времени
              </label>
            </div>
          </div>
        </div>

        {/* Оплата */}
        <div className="shop-form-section">
          <h3 className="shop-form-section__title">Способ оплаты</h3>
          <div className="shop-form-section__block">
            <div className="shop-radio-group">
              <label className="shop-radio-label">
                <input
                  type="radio"
                  name="payment"
                  checked={payment === 'cash'}
                  onChange={() => setPayment('cash')}
                />
                Наличными
              </label>
              <label className="shop-radio-label">
                <input
                  type="radio"
                  name="payment"
                  checked={payment === 'card'}
                  onChange={() => setPayment('card')}
                />
                Банковской картой
              </label>
            </div>
          </div>
        </div>

        {/* Контактная информация */}
        <div className="shop-form-section">
          <h3 className="shop-form-section__title">Контактная информация</h3>
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
                  placeholder="+7 (___) ___-__-__"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Адрес (только при доставке) */}
            {deliveryType === 'delivery' && (
              <div className="shop-address-fields">
                <div className="shop-form-row" style={{ marginTop: 12 }}>
                  <div className="shop-form-field">
                    <label className="shop-form-field__label">Улица</label>
                    <input
                      className="shop-form-field__input"
                      type="text"
                      placeholder="Улица"
                      value={street}
                      onChange={e => setStreet(e.target.value)}
                    />
                  </div>
                  <div className="shop-form-field">
                    <label className="shop-form-field__label">Дом</label>
                    <input
                      className="shop-form-field__input"
                      type="text"
                      placeholder="Дом"
                      value={home}
                      onChange={e => setHome(e.target.value)}
                    />
                  </div>
                </div>
                <div className="shop-form-row shop-form-row--triple" style={{ marginTop: 12 }}>
                  <div className="shop-form-field">
                    <label className="shop-form-field__label">Квартира</label>
                    <input
                      className="shop-form-field__input"
                      type="text"
                      placeholder="Кв."
                      value={apart}
                      onChange={e => setApart(e.target.value)}
                    />
                  </div>
                  <div className="shop-form-field">
                    <label className="shop-form-field__label">Подъезд</label>
                    <input
                      className="shop-form-field__input"
                      type="text"
                      placeholder="Подъезд"
                      value={pod}
                      onChange={e => setPod(e.target.value)}
                    />
                  </div>
                  <div className="shop-form-field">
                    <label className="shop-form-field__label">Этаж</label>
                    <input
                      className="shop-form-field__input"
                      type="text"
                      placeholder="Этаж"
                      value={et}
                      onChange={e => setEt(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="shop-form-row shop-form-row--single" style={{ marginTop: 12 }}>
              <div className="shop-form-field">
                <label className="shop-form-field__label">Комментарий</label>
                <textarea
                  className="shop-form-field__textarea"
                  placeholder="Ваш комментарий к заказу"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
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
      </form>

      {/* Фиксированный футер */}
      <div className="shop-checkout__footer">
        <div className="shop-checkout__footer-inner">
          <div className="shop-checkout__summary">
            <div>Сумма заказа: <span className="shop-checkout__summary-total">{total}₽</span></div>
            {deliveryType === 'delivery' ? (
              <div>Доставка: <span className="shop-checkout__summary-total">бесплатно</span></div>
            ) : (
              <div>Самовывоз: <span className="shop-checkout__summary-total">{selectedPickup?.address}</span></div>
            )}
          </div>
          <button
            className="shop-checkout__submit"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Отправка...' : `ЗАКАЗАТЬ: ${total} ₽`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CheckoutForm;
