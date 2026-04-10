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
    if (telegramId) {
      window.location.href = `/profile?telegram_id=${telegramId}`;
    } else {
      window.location.href = '/profile';
    }
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
          // Обновляем кэш пользователя
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
        <div className="shop-settings">
          {/* Ваши заказы */}
          <a
            className="shop-settings__btn"
            href="https://sushi-house.zenky.app/orders"
            target="_blank"
            rel="noopener noreferrer"
          >
            📦 Ваши заказы
            <span className="shop-settings__arrow">→</span>
          </a>

          {/* Доставка и оплата */}
          <button className="shop-settings__btn" onClick={() => toggle('delivery')}>
            🚚 Доставка и оплата
            <span className="shop-settings__arrow">{expandedSection === 'delivery' ? '▾' : '›'}</span>
          </button>
          {expandedSection === 'delivery' && (
            <div className="shop-settings__content">
              <p>🍱 В боте есть кнопка <b>ЗАКАЗАТЬ</b> — синяя, внизу. Нажимаете, открывается Мини-Апп, входите по номеру телефона и оформляете заказ.</p>
              <p>📦 1. <b>Доставим курьером Яндекса</b></p>
              <p>📍 2. <b>Конечно есть Самовывоз</b><br/>из наших заведений:<br/>
                • ул. Ю. Гагарина, д. 16Б<br/>
                • ул. Согласия, д. 46<br/>
                • ул. Автомобильная, д. 12Б<br/>
                • Гурьевск</p>
              <p>🤝 3. <b>В наших заведениях</b> можно приятно провести время и покушать, есть ароматный капучино, китайский чай и прохладительные напитки</p>
              <p>💰 4. <b>Расчёт стоимости</b> доставки производится администратором и зависит от удалённости к ближайшему заведению в нашей сети и суммы заказа. После оформления, администратор вам позвонит для подтверждения и сообщит стоимость доставки.</p>
              <p>💳 5. <b>Оплата заказов:</b><br/>
                — Наличными или картой курьеру;<br/>
                — Либо, при заказе в заведении;</p>
              <p>📞 6. <b>После оформления</b> и отправки вашего заказа, администратор перезвонит вам для уточнения пожеланий и подтверждения вашего заказа.</p>
            </div>
          )}

          {/* Правила подписки */}
          <button className="shop-settings__btn" onClick={() => toggle('rules')}>
            ℹ️ Правила подписки
            <span className="shop-settings__arrow">{expandedSection === 'rules' ? '▾' : '›'}</span>
          </button>
          {expandedSection === 'rules' && (
            <div className="shop-settings__content">
              <p><b>🏷️ ТАРИФЫ</b></p>
              <p><b>290 ₽/мес</b> — скидка 30% на все роллы и запечённые, 20% на сеты. Доступ к скидочному меню в приложении.</p>
              <p><b>690 ₽/мес</b> — все скидки тарифа 290₽, плюс 2 ролла в подарок каждые 15 дней — выбираешь из специальной витрины.</p>
              <p><b>1390 ₽/мес</b> — все скидки и подарочные роллы, плюс 1 сет в подарок каждые 30 дней и кофе к заказу.</p>

              <p><b>📌 УСЛОВИЯ ПОДАРКОВ</b></p>
              <p>🎁 <b>Подарочные роллы (тариф 690₽):</b> 1 ролл каждые 15 дней. Выбирается в приложении из закрытой витрины.</p>
              <p>🎁 <b>Подарочные сеты (тариф 1390₽):</b> 1 сет каждые 30 дней. Аналогично — выбирается в витрине подписчика.</p>
              <p>🚫 <b>Накопление недоступно</b> — если не забрал подарок в текущем периоде, он сгорает.</p>
              <p>👤 <b>Только для владельца подписки</b> — подарки нельзя передавать другим людям.</p>
              <p>🍣 Роллы и сеты можно заказать на доставку или самовывоз.</p>

              <p><b>💰 SHC БАЛЛЫ</b></p>
              <p>Приглашай друзей по реферальной ссылке из профиля. Когда друг оплатит подписку — тебе зачислится <b>20% от суммы его платежа</b> в SHC баллах. 1 SHC = 1 ₽. Минимум для списания — 3 000 баллов. Можно оплатить до 100% заказа.</p>

              <p><b>💳 ОПЛАТА И ПРОДЛЕНИЕ</b></p>
              <p>✅ Оплата через ЮKassa. Продление — вручную на 1, 3 или 5 месяцев через профиль.</p>
              <p>🔄 <b>Смена тарифа:</b> повысить можно в любой момент; понизить — только если нет неполученного подарка.</p>
              <p>🚫 <b>Отмена автосписания</b> — в настройках ниже на этой странице.</p>
              <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>ℹ️ Организатор оставляет за собой право корректировать стоимость и условия с уведомлением подписчиков.</p>
            </div>
          )}

          {/* Отмена автосписания */}
          <button className="shop-settings__btn shop-settings__btn--danger" onClick={() => toggle('cancel')}>
            🚫 Отмена автосписания
            <span className="shop-settings__arrow">{expandedSection === 'cancel' ? '▾' : '›'}</span>
          </button>
          {expandedSection === 'cancel' && (
            <div className="shop-settings__content">
              {profile?.статусСписания !== 'активно' ? (
                <p>Автосписание уже было отменено ранее.</p>
              ) : cancelStep === 'done' ? (
                <div className="shop-settings__cancel-done">
                  <p>✅ Автосписание отменено. Подписка деактивирована.</p>
                </div>
              ) : cancelStep === 'confirm' ? (
                <div className="shop-settings__cancel-confirm">
                  <p>😞 <b>{firstName}</b>, если отпишитесь сейчас — потеряете доступ в закрытый VIP канал и лишитесь всех выгод и привилегий подписки.</p>
                  <p>😍 Сеты со скидкой 20% перестанут быть вам доступны (покупка одного сета полностью окупает все расходы на подписку).</p>
                  <p>🎁 Плюс, бесплатные роллы. Общая выгода ваша в месяц выходит около 3000₽. Вы действительно хотите её лишиться?</p>
                  <div className="shop-settings__cancel-buttons">
                    <button
                      className="shop-settings__cancel-btn shop-settings__cancel-btn--stay"
                      onClick={() => { setCancelStep(null); setExpandedSection(null); }}
                    >
                      😊 Остаться
                    </button>
                    <button
                      className="shop-settings__cancel-btn shop-settings__cancel-btn--leave"
                      disabled={cancelLoading}
                      onClick={handleCancel}
                    >
                      {cancelLoading ? '⏳...' : '😢 Потерять выгоду'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p>Вы действительно хотите отменить автосписание?</p>
                  <button
                    className="shop-settings__cancel-btn shop-settings__cancel-btn--leave"
                    onClick={() => setCancelStep('confirm')}
                  >
                    Да, хочу отменить
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
