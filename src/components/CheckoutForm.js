// src/components/CheckoutForm.js — Форма оформления заказа (тёмная тема)

import React, { useState, useMemo, useEffect } from 'react';

const PICKUP_POINTS = [
  { id: '1', address: 'ул. Ю.Гагарина, д. 16Б', hours: '10:00–22:00', affiliate: '184' },
  { id: '2', address: 'ул. Согласия, д. 46', hours: '10:00–22:00', affiliate: '435' },
  { id: '3', address: 'ул. Автомобильная, д. 12Б', hours: '10:00–22:00', affiliate: '457' },
  { id: '4', address: 'Гурьевск', hours: '10:00–22:00', affiliate: '396' },
];

const CLOSE_HOUR = 22; // Закрытие в 22:00
const OPEN_HOUR = 10;  // Открытие в 10:00

/**
 * Генерирует список доступных временных слотов (шаг 15 мин)
 * Минимум: текущее время + 1 час (округлено вверх до 15 мин)
 */
function getTimeSlots() {
  const now = new Date();
  // +1 час от текущего момента
  const minTime = new Date(now.getTime() + 60 * 60 * 1000);

  // Округляем вверх до ближайших 15 мин
  const mins = minTime.getMinutes();
  const roundedMins = Math.ceil(mins / 15) * 15;
  minTime.setMinutes(roundedMins, 0, 0);
  if (roundedMins >= 60) {
    minTime.setHours(minTime.getHours() + 1);
    minTime.setMinutes(0);
  }

  let startHour = minTime.getHours();
  let startMin = minTime.getMinutes();

  // Если уже позже закрытия — нет слотов
  if (startHour >= CLOSE_HOUR) return [];

  // Если раньше открытия — начинаем с открытия
  if (startHour < OPEN_HOUR) {
    startHour = OPEN_HOUR;
    startMin = 0;
  }

  const slots = [];
  for (let h = startHour; h < CLOSE_HOUR; h++) {
    for (let m = (h === startHour ? startMin : 0); m < 60; m += 15) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      slots.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` });
    }
  }
  // Добавляем последний слот — к закрытию
  slots.push({ value: `${CLOSE_HOUR}:00`, label: `${CLOSE_HOUR}:00` });

  return slots;
}

/**
 * Формирует datetime строку для Frontpad (YYYY-MM-DD HH:MM:SS)
 */
function buildDatetime(timeStr) {
  const now = new Date();
  const [h, m] = timeStr.split(':').map(Number);

  const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);

  // Если выбранное время уже прошло (теоретически) — на завтра
  if (dt <= now) {
    dt.setDate(dt.getDate() + 1);
  }

  const Y = dt.getFullYear();
  const M = String(dt.getMonth() + 1).padStart(2, '0');
  const D = String(dt.getDate()).padStart(2, '0');
  return `${Y}-${M}-${D} ${timeStr}:00`;
}

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

  // Автозаполнение имени и телефона из WATBOT CRM
  useEffect(() => {
    if (!telegramId) return;
    fetch('/api/get-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: telegramId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.name) setName(data.name);
        if (data.phone) setPhone(data.phone);
      })
      .catch(() => {});
  }, [telegramId]);

  // Доступные слоты времени
  const timeSlots = useMemo(() => getTimeSlots(), []);
  const [scheduledTime, setScheduledTime] = useState(timeSlots[0]?.value || '');

  const selectedPickup = PICKUP_POINTS.find(p => p.id === pickupPoint);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Укажите имя'); return; }
    if (!phone.trim()) { setError('Укажите телефон'); return; }
    if (deliveryType === 'delivery' && !street.trim()) { setError('Укажите улицу'); return; }
    if (timeType === 'scheduled' && !scheduledTime) { setError('Выберите время'); return; }

    setSubmitting(true);

    try {
      const pickupAddress = selectedPickup ? selectedPickup.address : '';
      const paymentLabel = payment === 'card' ? 'Оплата картой' : 'Оплата наличными';
      const timeLabel = timeType === 'scheduled' ? `Ко времени: ${scheduledTime}` : 'Как можно скорее';

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
          datetime: timeType === 'scheduled' ? buildDatetime(scheduledTime) : '',
          comment: [
            comment.trim(),
            deliveryType === 'pickup' ? `Самовывоз: ${pickupAddress}` : '',
            timeLabel,
            paymentLabel,
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
                Как можно скорее
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

            {/* Выбор времени */}
            {timeType === 'scheduled' && (
              <div className="shop-time-picker">
                {timeSlots.length > 0 ? (
                  <select
                    className="shop-time-picker__select"
                    value={scheduledTime}
                    onChange={e => setScheduledTime(e.target.value)}
                  >
                    {timeSlots.map(slot => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="shop-time-picker__closed">
                    На сегодня приём заказов закрыт
                  </div>
                )}
              </div>
            )}
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
