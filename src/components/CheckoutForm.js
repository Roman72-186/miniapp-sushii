// src/components/CheckoutForm.js — Форма оформления заказа (тёмная тема)

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useUser } from '../UserContext';
import { isShopOpen, getTimeSlots } from '../utils/timeUtils';
import { normalizePhone } from '../utils/phone';
import { PICKUP_POINTS } from '../config/pickupPoints';

const LS_CHECKOUT_KEY = 'sushii_last_checkout';

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
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const { listItemName, phone: userPhone, profile } = useUser();
  const shcBalance = profile?.balance_shc || 0;
  const [shcApplied, setShcApplied] = useState(0);
  const effectiveTotal = Math.max(0, total - shcApplied);
  const [deliveryType, setDeliveryType] = useState(() => {
    const hasGift = items.some(item => item?.product?.gift);
    const hasNonGift = items.some(item => !item?.product?.gift);
    return (hasGift && !hasNonGift) ? 'pickup' : 'delivery';
  });
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
  const [persons, setPersons] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [nearestStore, setNearestStore] = useState(null);
  const [nearestLoading, setNearestLoading] = useState(false);
  const shopOpen = useMemo(() => isShopOpen(), []);

  // Автозаполнение имени, телефона и адреса из контекста/localStorage
  useEffect(() => {
    if (listItemName && !name) setName(listItemName);
    if (userPhone && !phone) setPhone(normalizePhone(userPhone));

    // Адрес: localStorage (свежее, если там есть улица) → profile.last_address (из БД)
    try {
      const raw = localStorage.getItem(LS_CHECKOUT_KEY);
      const localData = raw ? JSON.parse(raw) : null;
      const profileAddr = profile?.last_address ? JSON.parse(profile.last_address) : null;
      // localStorage имеет приоритет только если там сохранён адрес доставки (есть street)
      const addr = (localData?.street ? localData : null) || profileAddr;
      if (addr) {
        if (addr.street) setStreet(addr.street);
        if (addr.home)   setHome(addr.home);
        if (addr.apart)  setApart(addr.apart);
        if (addr.pod)    setPod(addr.pod);
        if (addr.et)     setEt(addr.et);
      }
      const lastPickup = localData?.pickupPoint || profile?.last_pickup_point || null;
      if (lastPickup) setPickupPoint(lastPickup);
    } catch {}
  }, [listItemName, userPhone, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Доступные слоты времени
  const timeSlots = useMemo(() => getTimeSlots(), []);
  const [scheduledTime, setScheduledTime] = useState(timeSlots[0]?.value || '');

  const selectedPickup = PICKUP_POINTS.find(p => p.id === pickupPoint);
  const hasGiftItems = useMemo(
    () => items.some(item => item?.product?.gift),
    [items]
  );
  const hasNonGiftItems = useMemo(
    () => items.some(item => !item?.product?.gift),
    [items]
  );
  const hasOnlyGiftItems = hasGiftItems && !hasNonGiftItems;

  useEffect(() => {
    if (hasOnlyGiftItems && deliveryType !== 'pickup') {
      setDeliveryType('pickup');
    }
  }, [deliveryType, hasOnlyGiftItems]);

  // Определение ближайшей точки при вводе адреса доставки
  const nearestTimerRef = useRef(null);
  const fetchNearestStore = useCallback(async (addr) => {
    if (!addr || addr.length < 3) { setNearestStore(null); return; }
    setNearestLoading(true);
    try {
      const res = await fetch('/api/nearest-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      });
      const data = await res.json();
      if (data.success && data.nearest) {
        setNearestStore(data.nearest);
      } else {
        setNearestStore(null);
      }
    } catch {
      setNearestStore(null);
    } finally {
      setNearestLoading(false);
    }
  }, []);

  useEffect(() => {
    if (deliveryType !== 'delivery') { setNearestStore(null); return; }
    const addr = [street.trim(), home.trim()].filter(Boolean).join(', ');
    if (nearestTimerRef.current) clearTimeout(nearestTimerRef.current);
    if (addr.length < 3) { setNearestStore(null); return; }
    nearestTimerRef.current = setTimeout(() => fetchNearestStore(addr), 800);
    return () => { if (nearestTimerRef.current) clearTimeout(nearestTimerRef.current); };
  }, [street, home, deliveryType, fetchNearestStore]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Укажите имя'); return; }
    if (!phone.trim()) { setError('Укажите телефон'); return; }

    const finalPhone = normalizePhone(phone.trim());
    if (!/^7\d{10}$/.test(finalPhone)) {
      setError('Телефон должен быть в формате +7XXXXXXXXXX');
      return;
    }

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
            id: item.product.sku || item.product.frontpadId || item.product.id,
            product_id: item.product.id,
            quantity: item.quantity,
            name: item.product.cleanName || item.product.name,
            price: item.product.price,
          })),
          client: {
            name: name.trim(),
            phone: finalPhone,
            street: deliveryType === 'delivery' ? street.trim() : pickupAddress,
            home: deliveryType === 'delivery' ? home.trim() : '',
            apart: deliveryType === 'delivery' ? apart.trim() : '',
            pod: deliveryType === 'delivery' ? pod.trim() : '',
            et: deliveryType === 'delivery' ? et.trim() : '',
          },
          payment,
          delivery_type: deliveryType,
          affiliate: deliveryType === 'pickup'
            ? selectedPickup?.affiliate || ''
            : nearestStore?.affiliate || '',
          pickup_point_id: deliveryType === 'pickup' ? selectedPickup?.id || '' : '',
          pickup_point_address: deliveryType === 'pickup' ? pickupAddress : '',
          datetime: timeType === 'scheduled' ? buildDatetime(scheduledTime) : '',
          comment: [
            comment.trim(),
            persons > 1 ? `Персон: ${persons}` : '',
            deliveryType === 'pickup' ? `Самовывоз: ${pickupAddress}` : '',
            timeLabel,
            paymentLabel,
          ].filter(Boolean).join(' | '),
          telegram_id: telegramId || '',
          order_type: 'discount',
          persons,
          shc_used: shcApplied > 0 ? shcApplied : undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка создания заказа');
      }

      // Если в заказе есть подарок — фиксируем его получение (только после успеха Frontpad)
      const giftItem = items.find(item => item?.product?.gift);
      let giftClaim = null;
      if (giftItem && telegramId) {
        try {
          const claimRes = await fetch('/api/claim-gift', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegram_id: telegramId,
              address: deliveryType === 'pickup' ? selectedPickup?.address || null : null,
              gift_name: giftItem.product.cleanName || giftItem.product.name || null,
            }),
          });
          giftClaim = await claimRes.json();
          if (!claimRes.ok || !giftClaim?.success) {
            console.error('[claim-gift] Ошибка фиксации подарка:', giftClaim);
          }
        } catch (claimErr) {
          console.error('[claim-gift] Сетевая ошибка:', claimErr.message);
        }
      }

      // Сохраняем адрес для автозаполнения при следующем заказе
      try {
        const toSave = deliveryType === 'delivery'
          ? { street: street.trim(), home: home.trim(), apart: apart.trim(), pod: pod.trim(), et: et.trim(), pickupPoint }
          : { pickupPoint };
        localStorage.setItem(LS_CHECKOUT_KEY, JSON.stringify(toSave));
      } catch {}

      onSuccess(data.orderNumber || data.orderId, { giftClaim });
    } catch (err) {
      setError(err.message || 'Не удалось отправить заказ');
    } finally {
      setSubmitting(false);
    }
  };

  if (!shopOpen) {
    return (
      <div className="shop-checkout">
        <div className="shop-checkout__inner">
          <div className="shop-checkout__header">
            <button type="button" className="shop-checkout__back" onClick={onBack}>←</button>
            <h2 className="shop-checkout__title">Оформление заказа</h2>
          </div>
          <div className="shop-checkout__closed">
            <div className="shop-checkout__closed-icon">🕐</div>
            <div className="shop-checkout__closed-title">Приём заказов закрыт</div>
            <div className="shop-checkout__closed-text">Заказы принимаются ежедневно с 10:00 до 21:50 (Калининград)</div>
          </div>
        </div>
      </div>
    );
  }

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
            {hasOnlyGiftItems && (
              <div className="shop-radio-hint" style={{ marginBottom: 12 }}>
                Подарки по подписке доступны только на самовывоз.
              </div>
            )}
            {hasGiftItems && hasNonGiftItems && (
              <div className="shop-radio-hint" style={{ marginBottom: 12 }}>
                Подарок по подписке будет включён в ваш заказ.
              </div>
            )}
            <div className="shop-radio-group">
              <label className="shop-radio-label">
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryType === 'delivery'}
                  disabled={hasOnlyGiftItems}
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
                  onBlur={() => { if (phone.trim()) setPhone(normalizePhone(phone.trim())); }}
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

            {/* Ближайший пункт (при доставке) */}
            {deliveryType === 'delivery' && (nearestStore || nearestLoading) && (
              <div className="shop-nearest-store" style={{ marginTop: 12 }}>
                {nearestLoading ? (
                  <div className="shop-nearest-store__loading">Определяем ближайший пункт...</div>
                ) : nearestStore && (
                  <div className="shop-nearest-store__info">
                    <div className="shop-nearest-store__label">Ближайший пункт:</div>
                    <div className="shop-nearest-store__name">{nearestStore.name}</div>
                    <div className="shop-nearest-store__distance">{nearestStore.distanceText} от вас</div>
                  </div>
                )}
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

            <div className="shop-form-row shop-form-row--single" style={{ marginTop: 12 }}>
              <div className="shop-form-field">
                <label className="shop-form-field__label">Количество персон</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    type="button"
                    className="shop-form-field__input"
                    style={{ width: 36, padding: 0, textAlign: 'center', cursor: 'pointer', flexShrink: 0 }}
                    onClick={() => setPersons(p => Math.max(1, p - 1))}
                  >−</button>
                  <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 600, fontSize: 16 }}>{persons}</span>
                  <button
                    type="button"
                    className="shop-form-field__input"
                    style={{ width: 36, padding: 0, textAlign: 'center', cursor: 'pointer', flexShrink: 0 }}
                    onClick={() => setPersons(p => Math.min(20, p + 1))}
                  >+</button>
                </div>
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

      {/* SHC баллы */}
      {shcBalance >= 3000 && (
        <div className="shop-shc-block">
          <div className="shop-shc-block__header">
            <span className="shop-shc-block__label">Баланс SHC: <strong>{shcBalance}</strong> баллов = {shcBalance}₽</span>
          </div>
          <div className="shop-shc-block__row">
            <span>Применить баллы:</span>
            <input
              className="shop-shc-block__input"
              type="number"
              min={0}
              max={Math.min(shcBalance, total)}
              value={shcApplied}
              onChange={e => setShcApplied(Math.min(Math.max(0, Number(e.target.value) || 0), Math.min(shcBalance, total)))}
            />
            <button
              type="button"
              className="shop-shc-block__max-btn"
              onClick={() => setShcApplied(Math.min(shcBalance, total))}
            >
              Всё
            </button>
          </div>
          {shcApplied > 0 && (
            <div className="shop-shc-block__discount">Скидка: −{shcApplied}₽ → итого {effectiveTotal}₽</div>
          )}
        </div>
      )}

      {/* SHC баллы — прогресс до порога 900 */}
      {shcBalance > 0 && shcBalance < 3000 && (
        <div className="shop-shc-block shop-shc-block--locked">
          <div className="shop-shc-block__header">
            <span className="shop-shc-block__label">SHC баллы: <strong>{shcBalance}</strong> / 3000</span>
          </div>
          <div className="shop-shc-block__hint">Ещё {3000 - shcBalance} баллов — и сможете оплачивать заказы</div>
          <div className="shop-shc-block__progress">
            <div style={{ width: `${Math.round((shcBalance / 3000) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* Фиксированный футер */}
      <div className="shop-checkout__footer">
        <div className="shop-checkout__footer-inner">
          <div className="shop-checkout__summary">
            <div>Сумма заказа: <span className="shop-checkout__summary-total">{total}₽</span></div>
            {shcApplied > 0 && (
              <div>SHC скидка: <span className="shop-checkout__summary-total" style={{ color: '#3CC8A1' }}>−{shcApplied}₽</span></div>
            )}
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
            {submitting ? 'Отправка...' : `ЗАКАЗАТЬ: ${effectiveTotal} ₽`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CheckoutForm;
