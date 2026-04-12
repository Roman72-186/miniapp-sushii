// src/SettingsPage.js — Настройки и опции

import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import './shop.css';
import BrandLoader from './components/BrandLoader';

function SettingsPage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const { telegramId, loading, profile, sync } = useUser();
  const [expandedSection, setExpandedSection] = useState(null);
  const [cancelStep, setCancelStep] = useState(null); // null | 'confirm' | 'done'
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleBack = () => {
    window.location.href = telegramId ? `/profile?telegram_id=${telegramId}` : '/profile';
  };

  const toggle = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
    setCancelStep(null);
  };

  const handleCancel = () => {
    if (!profile?.contact_id) return;
    setCancelLoading(true);
    fetch('/api/cancel-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: telegramId, contact_id: profile.contact_id }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setCancelStep('done');
          sync(true);
        } else {
          alert(data.error || 'Ошибка отмены');
        }
      })
      .catch(() => alert('Ошибка сети'))
      .finally(() => setCancelLoading(false));
  };

  const firstName = profile?.name ? profile.name.split(' ')[0] : 'друг';

  return (
    <div className="shop-page">
      <header className="shop-header">
        <button className="shop-header__back" onClick={handleBack}>←</button>
        <div className="shop-header__center">
          <span className="shop-header__title">Настройки и опции</span>
        </div>
        <div className="shop-header__spacer" />
      </header>

      {loading ? (
        <BrandLoader text="Загружаем настройки" />
      ) : (
        <div className="pf-page">

          {/* Ваши заказы — ссылка */}
          <a
            className="pf-settings-link"
            href="https://sushi-house.zenky.app/orders"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>📦 Ваши заказы</span>
            <span className="pf-settings-link__arrow">→</span>
          </a>

          {/* Аккордеон */}
          <div className="pf-accordion">

            {/* Доставка и оплата */}
            <div className="pf-accordion__item">
              <button className="pf-accordion__hdr" onClick={() => toggle('delivery')}>
                <span>🚚 Доставка и оплата</span>
                <span className="pf-accordion__arrow">{expandedSection === 'delivery' ? '▾' : '▸'}</span>
              </button>
              {expandedSection === 'delivery' && (
                <div className="pf-accordion__body pf-settings__text">
                  <p>🍱 В боте есть кнопка <b>ЗАКАЗАТЬ</b> — синяя, внизу. Нажимаете, открывается Мини-Апп, входите по номеру телефона и оформляете заказ.</p>
                  <p>📦 1. <b>Доставим курьером Яндекса</b></p>
                  <p>📍 2. <b>Самовывоз</b> из наших заведений:<br/>
                    • ул. Ю. Гагарина, д. 16Б<br/>
                    • ул. Согласия, д. 46<br/>
                    • ул. Автомобильная, д. 12Б<br/>
                    • Гурьевск</p>
                  <p>🤝 3. <b>В наших заведениях</b> — можно поесть на месте, есть кофе, чай и напитки.</p>
                  <p>💰 4. <b>Стоимость доставки</b> рассчитывается администратором. После оформления вам перезвонят.</p>
                  <p>💳 5. <b>Оплата:</b> наличными или картой курьеру / при заказе в заведении.</p>
                </div>
              )}
            </div>

            {/* Правила подписки */}
            <div className="pf-accordion__item">
              <button className="pf-accordion__hdr" onClick={() => toggle('rules')}>
                <span>ℹ️ Правила подписки</span>
                <span className="pf-accordion__arrow">{expandedSection === 'rules' ? '▾' : '▸'}</span>
              </button>
              {expandedSection === 'rules' && (
                <div className="pf-accordion__body pf-settings__text">
                  <p className="pf-settings__section-title">🏷️ ТАРИФЫ</p>
                  <p><b>290 ₽/мес</b> — скидка 30% на роллы и запечённые, 20% на сеты.</p>
                  <p><b>690 ₽/мес</b> — все скидки + 2 ролла в подарок каждые 15 дней.</p>
                  <p><b>1390 ₽/мес</b> — все скидки + роллы + 1 сет каждые 30 дней + кофе.</p>

                  <p className="pf-settings__section-title">📌 УСЛОВИЯ ПОДАРКОВ</p>
                  <p>🎁 <b>Роллы (690₽):</b> 1 ролл каждые 15 дней, выбирается в приложении.</p>
                  <p>🎁 <b>Сеты (1390₽):</b> 1 сет каждые 30 дней, выбирается в приложении.</p>
                  <p>🚫 <b>Накопление недоступно</b> — неполученный подарок сгорает.</p>
                  <p>👤 <b>Только для владельца</b> — подарки нельзя передавать другим.</p>

                  <p className="pf-settings__section-title">💎 SHC БАЛЛЫ</p>
                  <p>Пригласи друга — получи <b>20% от суммы его подписки</b> в SHC баллах. 1 SHC = 1 ₽. Минимум для списания — 3 000 баллов. Можно оплатить до 100% заказа.</p>

                  <p className="pf-settings__section-title">💳 ОПЛАТА И ПРОДЛЕНИЕ</p>
                  <p>✅ Оплата через ЮKassa. Продление вручную на 1, 3 или 5 месяцев через профиль.</p>
                  <p>🔄 <b>Смена тарифа:</b> повысить — в любой момент; понизить — только если нет неполученного подарка.</p>
                  <p style={{ color: '#555577', fontSize: 12, marginTop: 4 }}>ℹ️ Организатор оставляет за собой право корректировать условия с уведомлением подписчиков.</p>
                </div>
              )}
            </div>

            {/* Отмена автосписания */}
            <div className="pf-accordion__item">
              <button className="pf-accordion__hdr pf-accordion__hdr--danger" onClick={() => toggle('cancel')}>
                <span>🚫 Отмена автосписания</span>
                <span className="pf-accordion__arrow">{expandedSection === 'cancel' ? '▾' : '▸'}</span>
              </button>
              {expandedSection === 'cancel' && (
                <div className="pf-accordion__body">
                  {profile?.статусСписания !== 'активно' ? (
                    <p className="pf-settings__info">Автосписание уже было отменено ранее.</p>
                  ) : cancelStep === 'done' ? (
                    <p className="pf-settings__info pf-settings__info--success">✅ Автосписание отменено. Подписка деактивирована.</p>
                  ) : cancelStep === 'confirm' ? (
                    <div className="pf-settings__cancel-confirm">
                      <p className="pf-settings__text">😞 <b>{firstName}</b>, если отпишетесь — потеряете доступ в VIP-канал и все скидки.</p>
                      <p className="pf-settings__text">🎁 Бесплатные роллы, скидки на сеты. Общая выгода в месяц — около 3000 ₽. Уверены?</p>
                      <div className="pf-settings__cancel-btns">
                        <button
                          className="pf-settings__stay-btn"
                          onClick={() => { setCancelStep(null); setExpandedSection(null); }}
                        >
                          😊 Остаться
                        </button>
                        <button
                          className="pf-settings__leave-btn"
                          disabled={cancelLoading}
                          onClick={handleCancel}
                        >
                          {cancelLoading ? '⏳...' : '😢 Отменить'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pf-settings__cancel-confirm">
                      <p className="pf-settings__text">Вы действительно хотите отменить автосписание?</p>
                      <button
                        className="pf-settings__leave-btn"
                        onClick={() => setCancelStep('confirm')}
                      >
                        Да, хочу отменить
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
