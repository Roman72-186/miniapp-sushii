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
      body: JSON.stringify({ contact_id: profile.contact_id }),
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
              <p>📍 2. <b>Конечно есть Самовывоз</b><br/>из наших заведений в Калининграде:<br/>
                • ул. Согласия, 37<br/>
                • ул. Дзержинского, 154<br/>
                • ул. А. Невского, 201</p>
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
              <p><b>✅ Преимущества тарифа за 1190₽:</b></p>
              <ul>
                <li><b>Скидка</b> на ВСЕ роллы 30%</li>
                <li><b>Скидка</b> на сеты 20% <b>весь день</b></li>
                <li><b>Доступ</b> в закрытый клуб</li>
                <li><b>Бесплатный кофе</b> к каждому заказу</li>
                <li><b>Бесплатный сет</b> до 2000₽ на выбор</li>
              </ul>
              <p>✅ <b>Скидка -20%</b> на сеты, супы, боулы</p>
              <p>✅ <b>Скидка -30%</b> на роллы</p>
              <p>✅ <b>Доступ в закрытый канал</b> со спец. скидками и бонусами от Суши Хаус 39</p>

              <p><b>📌 УСЛОВИЯ РАБОТЫ ПОДПИСКИ</b></p>
              <p>🍣 <b>Ролл и сет по подписке</b> можно заказать на доставку/самовывоз.</p>
              <p>⏳ <b>За 30 дней можно бесплатно забрать 2 ролла</b> (один ролл раз в 15 дней в специальной витрине) или сет (если подписка за 1190)</p>
              <p>🚫 <b>Накопление подарков недоступно</b> — нельзя забрать сразу 2 ролла в один период.</p>
              <p>👤 <b>Только для вас</b> — роллы по подписке нельзя передавать другим людям.</p>
              <p>ℹ️ Организатор оставляет за собой право корректировать стоимость и правила с уведомлением подписчиков.</p>

              <p><b>💳 ОПЛАТА И ПРОДЛЕНИЕ</b></p>
              <p>✅ <b>Автосписания через ЮKassa</b> — раз в 30 дней с выбранного способа оплаты.</p>
              <p>🔁 <b>Если не хватит средств</b> — система повторит попытку, можно изменить платёжный метод.</p>
              <p>🚫 <b>Отмена автосписания</b> — в настройках просто нажмите кнопку и у вас не будет автосписания.</p>
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
