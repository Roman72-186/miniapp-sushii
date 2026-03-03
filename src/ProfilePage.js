// src/ProfilePage.js — Личный кабинет /profile

import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import './shop.css';
import BrandLoader from './components/BrandLoader';

function ProfilePage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const { telegramId, loading: userLoading, profile, contactId, hasTag } = useUser();
  const [referrals, setReferrals] = useState(null);
  const [showAllReferrals, setShowAllReferrals] = useState(false);
  const [vipLoading, setVipLoading] = useState(false);

  // Загружаем рефералов отдельно (зависит от contactId)
  useEffect(() => {
    if (!contactId) {
      if (!userLoading) setReferrals({ referrals_count: 0, ambassadors_count: 0, referrals: [] });
      return;
    }
    fetch('/api/get-referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: contactId }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(refData => {
        setReferrals(refData || { referrals_count: 0, ambassadors_count: 0, referrals: [] });
      })
      .catch(() => setReferrals({ referrals_count: 0, ambassadors_count: 0, referrals: [] }));
  }, [contactId, userLoading]);

  const handleBack = () => {
    if (telegramId) {
      window.location.href = `/discount-shop?telegram_id=${telegramId}`;
    } else {
      window.location.href = '/discount-shop';
    }
  };

  const formatPhone = (raw) => {
    if (!raw) return '—';
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 11) {
      return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
    }
    if (digits.length === 10) {
      return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
    }
    return `+${digits}`;
  };

  const error = !userLoading && !telegramId ? 'Telegram ID не найден' : null;

  return (
    <div className="shop-page">
      <header className="shop-header">
        <button className="shop-header__back" onClick={handleBack}>
          ←
        </button>
        <div className="shop-header__center">
          <span className="shop-header__title">Личный кабинет</span>
        </div>
        <div className="shop-header__spacer" />
      </header>

      {userLoading ? (
        <BrandLoader text="Загружаем профиль" />
      ) : error ? (
        <div className="shop-loading">
          <span className="shop-loading__text" style={{ color: '#e53935' }}>{error}</span>
        </div>
      ) : (
        <div className="shop-profile">
          <div className="shop-profile__block">
            {/* Заголовок кабинета */}
            <div className="shop-profile__header">
              🍣 КАБИНЕТ СУШИ-ХАУС 39
            </div>

            {/* Профиль */}
            <div className="shop-profile__section">
              <div className="shop-profile__row">
                <span className="shop-profile__label">👤 Профиль:</span>
                <span className="shop-profile__value">{profile?.name || '—'}</span>
              </div>
              <div className="shop-profile__row">
                <span className="shop-profile__label">📱 Контакт:</span>
                <span className="shop-profile__value">{formatPhone(profile?.phone)}</span>
              </div>
            </div>

            {/* Подписка */}
            <div className="shop-profile__section">
              <div className="shop-profile__row">
                <span className="shop-profile__label">📋 Статус подписки:</span>
                <span className="shop-profile__value">{profile?.статусСписания || '—'}</span>
              </div>
              <div className="shop-profile__row">
                <span className="shop-profile__label">🔒 Действует до:</span>
                <span className="shop-profile__value">{profile?.датаОКОНЧАНИЯ || '—'}</span>
              </div>
            </div>

            {/* Амбассадор */}
            {hasTag('Амба') ? (
              <>
                <div className="shop-profile__section">
                  <div className="shop-profile__ambassador-badge">
                    АМБАССАДОР
                  </div>
                </div>

                {/* Счётчики */}
                <div className="shop-profile__section">
                  <div className="amb-panel__counters">
                    <div className="amb-panel__counter">
                      <span className="amb-panel__counter-value">
                        {referrals === null ? '...' : referrals.referrals_count}
                      </span>
                      <span className="amb-panel__counter-label">Рефералов</span>
                    </div>
                    <div className="amb-panel__counter">
                      <span className="amb-panel__counter-value amb-panel__counter-value--gold">
                        {referrals === null ? '...' : referrals.ambassadors_count}
                      </span>
                      <span className="amb-panel__counter-label">Амбассадоров</span>
                    </div>
                  </div>
                </div>

                {/* Прогресс-бар уровня 2 */}
                <div className="shop-profile__section">
                  {(() => {
                    const ambCount = referrals?.ambassadors_count || 0;
                    const progress = Math.min(ambCount / 10, 1);
                    const isUnlocked = ambCount >= 10;
                    return (
                      <div className="amb-panel__progress">
                        <div className="amb-panel__progress-header">
                          <span className="amb-panel__progress-title">Уровень 2</span>
                          <span className={`amb-panel__progress-status${isUnlocked ? ' amb-panel__progress-status--open' : ''}`}>
                            {isUnlocked ? 'Открыт' : `${ambCount} / 10 амбассадоров`}
                          </span>
                        </div>
                        <div className="amb-panel__progress-bar">
                          <div
                            className={`amb-panel__progress-fill${isUnlocked ? ' amb-panel__progress-fill--full' : ''}`}
                            style={{ width: `${progress * 100}%` }}
                          />
                        </div>
                        {!isUnlocked && (
                          <div className="amb-panel__progress-hint">
                            Пригласите ещё {10 - ambCount} амбассадор{10 - ambCount === 1 ? 'а' : 'ов'} для открытия 5% с их рефералов
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Список рефералов */}
                <div className="shop-profile__section">
                  <div className="amb-panel__referrals-title">Приглашённые</div>
                  {referrals === null ? (
                    <div className="amb-panel__referrals-loading">Загрузка...</div>
                  ) : referrals.referrals.length === 0 ? (
                    <div className="amb-panel__referrals-empty">У вас пока нет рефералов</div>
                  ) : (
                    <>
                      <div className="amb-panel__referrals-list">
                        {(showAllReferrals ? referrals.referrals : referrals.referrals.slice(0, 5)).map((r, i) => (
                          <div key={i} className="amb-panel__referral-item">
                            <span className="amb-panel__referral-name">{r.name}</span>
                            {r.is_ambassador && (
                              <span className="amb-panel__referral-badge">AMB</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {referrals.referrals.length > 5 && (
                        <button
                          className="amb-panel__show-all"
                          onClick={() => setShowAllReferrals(v => !v)}
                        >
                          {showAllReferrals ? 'Свернуть' : `Показать всех (${referrals.referrals_count})`}
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Поделиться ссылкой */}
                {profile?.ref_url && (
                  <div className="shop-profile__section">
                    <button
                      className="shop-profile__invite-btn"
                      onClick={() => {
                        const text = 'Привет! Присоединяйся к Суши-Хаус 39 — вкусные роллы со скидкой по подписке 🍣';
                        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(profile.ref_url)}&text=${encodeURIComponent(text)}`;
                        const tg = window.Telegram?.WebApp;
                        if (tg?.openTelegramLink) {
                          tg.openTelegramLink(shareUrl);
                        } else {
                          window.open(shareUrl, '_blank');
                        }
                      }}
                    >
                      Поделиться ссылкой
                    </button>
                  </div>
                )}

                {/* Баланс SHC */}
                <div className="shop-profile__section">
                  <div className="shop-profile__row">
                    <span className="shop-profile__label">Мой баланс:</span>
                    <span className="shop-profile__value">{profile?.balance_shc ? `${profile.balance_shc} SHC` : '—'}</span>
                  </div>
                  <div className="shop-profile__hint">
                    (баланс за приглашённых в бота друзей)
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Блок приглашения для не-амбассадоров */}
                <div className="shop-profile__section">
                  <div className="amb-invite">
                    <div className="amb-invite__text">
                      Зарабатывайте <strong>30%</strong> с каждого платежа приглашённых друзей
                    </div>
                    <button
                      className="amb-invite__btn"
                      onClick={() => {
                        const tid = telegramId ? `?telegram_id=${telegramId}` : '';
                        window.location.href = `/pay/9990${tid}`;
                      }}
                    >
                      Стать амбассадором — 9 990 ₽
                    </button>
                  </div>
                </div>

                {/* Рефералы (как было) */}
                <div className="shop-profile__section">
                  <div className="shop-profile__row">
                    <span className="shop-profile__label">Приглашённые друзья:</span>
                    {referrals === null ? (
                      <span className="shop-profile__value" style={{ color: '#666' }}>...</span>
                    ) : (
                      <span className="shop-profile__value">
                        {referrals?.referrals_count ?? 0}
                      </span>
                    )}
                  </div>
                  {profile?.ref_url && (
                    <button
                      className="shop-profile__invite-btn"
                      onClick={() => {
                        const text = 'Привет! Присоединяйся к Суши-Хаус 39 — вкусные роллы со скидкой по подписке 🍣';
                        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(profile.ref_url)}&text=${encodeURIComponent(text)}`;
                        const tg = window.Telegram?.WebApp;
                        if (tg?.openTelegramLink) {
                          tg.openTelegramLink(shareUrl);
                        } else {
                          window.open(shareUrl, '_blank');
                        }
                      }}
                    >
                      Поделиться
                    </button>
                  )}
                </div>

                {/* Баланс */}
                <div className="shop-profile__section">
                  <div className="shop-profile__row">
                    <span className="shop-profile__label">Мой баланс:</span>
                    <span className="shop-profile__value">{profile?.balance_shc ? `${profile.balance_shc} SHC` : '—'}</span>
                  </div>
                  <div className="shop-profile__hint">
                    (баланс за приглашённых в бота друзей)
                  </div>
                </div>
              </>
            )}

            {/* Автопродление */}
            <div className="shop-profile__section">
              <div className="shop-profile__row">
                <span className="shop-profile__label">♻️ Автопродление:</span>
                <span className="shop-profile__value">{profile?.статусСписания || '—'}</span>
              </div>
              <div className="shop-profile__row">
                <span className="shop-profile__label">💳 Способ оплаты:</span>
                <span className="shop-profile__value">Юкасса</span>
              </div>
            </div>

            {/* Часы работы */}
            <div className="shop-profile__section">
              <div className="shop-profile__row">
                <span className="shop-profile__label">⏰ Принимаем заказы</span>
              </div>
              <div className="shop-profile__row">
                <span className="shop-profile__value">с 10:00 до 21:50</span>
              </div>
            </div>

            {/* VIP-клуб */}
            <div className="shop-profile__section">
              <button
                className="shop-profile__vip-btn"
                disabled={vipLoading}
                onClick={() => {
                  if (!telegramId) return;
                  setVipLoading(true);
                  fetch('/api/check-vip', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ telegram_id: telegramId }),
                  })
                    .then(r => r.json())
                    .then(data => {
                      if (data.is_member && data.chat_link) {
                        const tg = window.Telegram?.WebApp;
                        if (tg?.openTelegramLink) {
                          tg.openTelegramLink(data.chat_link);
                        } else {
                          window.open(data.chat_link, '_blank');
                        }
                      } else if (data.invite_link) {
                        const tg = window.Telegram?.WebApp;
                        if (tg?.openTelegramLink) {
                          tg.openTelegramLink(data.invite_link);
                        } else {
                          window.open(data.invite_link, '_blank');
                        }
                      } else {
                        alert(data.error || 'Не удалось получить ссылку');
                      }
                    })
                    .catch(() => alert('Ошибка проверки подписки'))
                    .finally(() => setVipLoading(false));
                }}
              >
                {vipLoading ? '⏳ Проверяем...' : '🔗 VIP-клуб Суши-Хаус'}
              </button>
            </div>

            {/* Поддержка */}
            <div className="shop-profile__section">
              <div className="shop-profile__note">
                💬 Если возникают сложности — смело пишите в поддержку бота. Мы всегда на связи и поможем разобраться!
              </div>
              <div className="shop-profile__buttons">
                <a className="shop-profile__link-btn" href="https://t.me/roman_chatbots" target="_blank" rel="noopener noreferrer">
                  🛠 Техническая поддержка
                </a>
                <a className="shop-profile__link-btn shop-profile__link-btn--admin" href="https://t.me/romansonel" target="_blank" rel="noopener noreferrer">
                  👨‍💼 Администратор
                </a>
              </div>
            </div>

            {/* Настройки */}
            <div className="shop-profile__section">
              <button
                className="shop-profile__link-btn"
                onClick={() => {
                  const url = telegramId ? `/settings?telegram_id=${telegramId}` : '/settings';
                  window.location.href = url;
                }}
              >
                ⚙️ Настройки и опции
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
