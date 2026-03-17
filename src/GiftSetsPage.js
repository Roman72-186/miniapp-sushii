// src/GiftSetsPage.js — Отдельная страница подарочных сетов (для кнопки в боте)
// Без навигации, после заказа — автозакрытие мини-аппа

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from './UserContext';
import { getProductImage } from './config/imageMap';
import { isShopOpen } from './utils/timeUtils';
import { normalizePhone } from './utils/phone';
import { PICKUP_POINTS } from './config/pickupPoints';
import BrandLoader from './components/BrandLoader';
import './shop.css';

function GiftSetsPage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const { telegramId, loading: userLoading, listItemName, phone: userPhone, userData, contactId } = useUser();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const shopOpen = useMemo(() => isShopOpen(), []);

  // Выбранный товар → форма оформления
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [pickupPoint, setPickupPoint] = useState(PICKUP_POINTS[0].id);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Загрузка сетов
  const fetchSets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/подписка 490/sets-490.json?v=' + Date.now());
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setProducts(
        data.items.filter(item => item.enabled !== false).map((item, idx) => ({
          id: item.sku || `gift-set-${idx}`,
          name: item.name,
          sku: item.sku,
          price: 0,
          image: getProductImage(item.name),
        }))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSets(); }, [fetchSets]);

  // Автозаполнение имени/телефона
  useEffect(() => {
    if (listItemName && !name) setName(listItemName);
    if (userPhone && !phone) setPhone(normalizePhone(userPhone));
  }, [listItemName, userPhone]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPickup = PICKUP_POINTS.find(p => p.id === pickupPoint);

  const handleSubmit = async () => {
    setFormError(null);
    if (!name.trim()) { setFormError('Укажите имя'); return; }
    if (!phone.trim()) { setFormError('Укажите телефон'); return; }

    const finalPhone = normalizePhone(phone.trim());
    if (!/^7\d{10}$/.test(finalPhone)) {
      setFormError('Телефон должен быть в формате +7XXXXXXXXXX');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: [{
            id: selectedProduct.sku,
            quantity: 1,
            name: selectedProduct.name,
            price: 0,
          }],
          client: {
            name: name.trim(),
            phone: finalPhone,
            street: selectedPickup.address,
            home: '', apart: '', pod: '', et: '',
          },
          payment: 'cash',
          delivery_type: 'pickup',
          affiliate: selectedPickup.affiliate,
          datetime: '',
          comment: `Подписка — ${selectedProduct.name} | Самовывоз: ${selectedPickup.address}`,
          telegram_id: telegramId || '',
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка создания заказа');

      const orderNum = data.orderNumber || data.orderId || '';
      const mesId = userData?.variables?.mes_id || null;

      // Fire-and-forget: отметить подарок как полученный
      if (telegramId) {
        fetch('/api/claim-gift', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegram_id: telegramId, contact_id: contactId || undefined }),
        }).catch(() => {});
      }

      // Fire-and-forget: сообщение в бот (с удалением предыдущего)
      if (telegramId) {
        fetch('/api/send-bot-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegram_id: telegramId,
            text: `✅ <b>Заказ №${orderNum} принят!</b>\n\n🍱 ${selectedProduct.name}\n📍 Самовывоз: ${selectedPickup.address}\n\nМы уже готовим ваш подарок. Ожидайте!`,
            reply_markup: {
              inline_keyboard: [[
                { text: '🏠 Главное меню', callback_data: '/start' },
              ]],
            },
            ...(mesId ? { delete_message_id: mesId } : {}),
          }),
        }).catch(() => {});
      }

      // Мгновенное закрытие мини-аппа
      const tg = window.Telegram?.WebApp;
      if (tg && tg.close) {
        tg.close();
      }
    } catch (err) {
      setFormError(err.message || 'Не удалось отправить заказ');
      setSubmitting(false);
    }
  };

  // === Закрыто ===
  if (selectedProduct && !shopOpen) {
    return (
      <div className="shop-page">
        <header className="shop-header">
          <button className="shop-header__back" onClick={() => setSelectedProduct(null)}>←</button>
          <div className="shop-header__center">
            <span className="shop-header__title">Оформление</span>
          </div>
          <div className="shop-header__spacer" />
        </header>
        <div className="shop-checkout" style={{ position: 'relative', zIndex: 1 }}>
          <div className="shop-checkout__inner">
            <div className="shop-checkout__closed">
              <div className="shop-checkout__closed-icon">🕐</div>
              <div className="shop-checkout__closed-title">Приём заказов закрыт</div>
              <div className="shop-checkout__closed-text">Заказы принимаются ежедневно с 10:00 до 21:50 (Калининград)</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === Форма оформления ===
  if (selectedProduct) {
    return (
      <div className="shop-page">
        <header className="shop-header">
          <div className="shop-header__center">
            <span className="shop-header__title">Оформление</span>
          </div>
          <div className="shop-header__spacer" />
        </header>

        <div className="shop-checkout" style={{ position: 'relative', zIndex: 1 }}>
          <div className="shop-checkout__inner">
            {/* Выбранный товар */}
            <div className="shop-form-section">
              <h3 className="shop-form-section__title">Ваш выбор</h3>
              <div className="shop-form-section__block" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  style={{ width: 60, height: 44, borderRadius: 8, objectFit: 'cover' }}
                  onError={e => { e.target.src = '/logo.jpg'; }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedProduct.name}</div>
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

            {/* Контактные данные */}
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

            {formError && (
              <div style={{ color: '#e53935', textAlign: 'center', marginBottom: 12, fontSize: 14 }}>
                {formError}
              </div>
            )}
          </div>

          <div className="shop-checkout__footer" style={{ position: 'relative' }}>
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
      </div>
    );
  }

  // === Список сетов ===
  return (
    <div className="shop-page">
      <header className="shop-header">
        <div className="shop-header__center">
          <img src="/logo.jpg" alt="Sushi House" className="shop-header__logo" />
          <span className="shop-header__title">Сеты в подарок</span>
        </div>
        <div className="shop-header__spacer" />
      </header>

      <div className="shop-section">
        <p style={{ color: '#999', fontSize: 13, margin: '8px 16px 0', padding: 0 }}>
          Выберите один сет — входит в вашу подписку
        </p>
      </div>

      {userLoading || loading ? (
        <BrandLoader text="Загружаем подарки" />
      ) : error ? (
        <div className="shop-error">
          <span className="shop-error__text">{error}</span>
          <button className="shop-error__retry" onClick={fetchSets}>Попробовать снова</button>
        </div>
      ) : (
        <div className="shop-grid">
          {products.map(product => (
            <div key={product.id} className="shop-card">
              <div className="shop-card__image-wrap">
                <img
                  src={product.image}
                  alt={product.name}
                  className="shop-card__image"
                  onError={e => { e.target.src = '/logo.jpg'; }}
                />
              </div>
              <div className="shop-card__body">
                <h3 className="shop-card__name">{product.name}</h3>
                <div className="shop-card__bottom">
                  <span className="shop-card__price" style={{ color: '#3CC8A1' }}>Подарок</span>
                  <button className="shop-card__add-btn" onClick={() => setSelectedProduct(product)}>
                    Выбрать
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GiftSetsPage;
