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
  const [earnings, setEarnings] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [showAllTxns, setShowAllTxns] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [giftHistory, setGiftHistory] = useState(null);

  // Загружаем рефералов (по telegram_id, fallback на contact_id)
  useEffect(() => {
    if (!telegramId && !contactId) {
      if (!userLoading) setReferrals({ referrals_count: 0, ambassadors_count: 0, referrals: [] });
      return;
    }
    const body = telegramId
      ? { telegram_id: telegramId }
      : { contact_id: contactId };
    fetch('/api/get-referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(r => r.ok ? r.json() : null)
      .then(refData => {
        setReferrals(refData || { referrals_count: 0, ambassadors_count: 0, referrals: [] });
      })
      .catch(() => setReferrals({ referrals_count: 0, ambassadors_count: 0, referrals: [] }));
  }, [telegramId, contactId, userLoading]);

  const [shcData, setShcData] = useState(null);
  const [bonuses, setBonuses] = useState(null);
  const [showAllBonuses, setShowAllBonuses] = useState(false);

  // Загружаем транзакции и SHC бонусы для всех пользователей
  useEffect(() => {
    if (!telegramId) return;
    fetch('/api/get-transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: telegramId }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setEarnings(data.earnings);
          setTransactions(data.transactions);
          setShcData(data.shc);
          setBonuses(data.bonuses);
        }
      })
      .catch(() => {});
  }, [telegramId]);

  useEffect(() => {
    if (!telegramId) {
      setGiftHistory([]);
      return;
    }
    fetch(`/api/get-gift-history?telegram_id=${telegramId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setGiftHistory(data?.success ? data.history : []); })
      .catch(() => setGiftHistory([]));
  }, [telegramId]);

  const refLink = telegramId ? `https://sushi-house-39.ru/?invited_by=${telegramId}` : null;

  const handleCopyLink = () => {
    if (!refLink) return;
    navigator.clipboard?.writeText(refLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareLink = () => {
    if (!refLink) return;
    const text = 'Суши-Хаус 39 🍣 — подписка со скидками 30% на роллы! Переходи по ссылке:';
    if (navigator.share) {
      navigator.share({ title: 'Суши-Хаус 39', text, url: refLink }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(refLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

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
                <span className="shop-profile__value" style={{ color: profile?.статусСписания === 'активно' ? '#3CC8A1' : '#999' }}>
                  {profile?.статусСписания || 'неактивно'}
                </span>
              </div>
              <div className="shop-profile__row">
                <span className="shop-profile__label">🔒 Действует до:</span>
                <span className="shop-profile__value">{profile?.датаОКОНЧАНИЯ || '—'}</span>
              </div>
            </div>

            {/* История подарков */}
            <div className="shop-profile__section">
              <div className="shop-profile__label" style={{ marginBottom: 10 }}>🎁 История подарков</div>
              {giftHistory === null ? (
                <div style={{ color: '#888', fontSize: 13 }}>Загрузка...</div>
              ) : giftHistory.length === 0 ? (
                <div style={{ color: '#888', fontSize: 13 }}>Подарков пока не было</div>
              ) : (
                <ul className="profile-gift-list">
                  {giftHistory.map((g, i) => (
                    <li key={i} className="profile-gift-item">
                      <span className="profile-gift-type">{g.gift_name || (g.gift_type === 'roll' ? 'Ролл' : 'Сет')}</span>
                      <span className="profile-gift-date">{g.claimed_at}</span>
                      {g.address && <span className="profile-gift-address">{g.address}</span>}
                      {g.granted_by === 'admin' && <span className="profile-gift-badge">от админа</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Амбассадор */}
            {hasTag('амба') ? (
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
                            Пригласите ещё {10 - ambCount} {(() => {
                              const n = 10 - ambCount;
                              const mod10 = n % 10;
                              const mod100 = n % 100;
                              if (mod100 >= 11 && mod100 <= 19) return 'амбассадоров';
                              if (mod10 === 1) return 'амбассадора';
                              if (mod10 >= 2 && mod10 <= 4) return 'амбассадора';
                              return 'амбассадоров';
                            })()} для открытия 5% с их рефералов
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

                {/* Реферальная ссылка */}
                {refLink && (
                  <div className="shop-profile__section">
                    <div className="shop-profile__partner-code-label">Ваша реферальная ссылка</div>
                    <div className="shop-profile__partner-code" style={{ fontSize: 12, wordBreak: 'break-all' }}>
                      sushi-house-39.ru/?invited_by={telegramId}
                    </div>
                    <div className="shop-profile__partner-code-actions">
                      <button className="shop-profile__invite-btn" onClick={handleCopyLink}>
                        {copiedLink ? 'Скопировано!' : 'Скопировать'}
                      </button>
                      <button className="shop-profile__invite-btn" onClick={handleShareLink}>
                        Поделиться
                      </button>
                    </div>
                  </div>
                )}

                {/* Заработок */}
                <div className="shop-profile__section">
                  <div className="amb-panel__earnings">
                    <div className="amb-panel__earnings-title">Заработок</div>
                    <div className="amb-panel__counters">
                      <div className="amb-panel__counter">
                        <span className="amb-panel__counter-value">
                          {earnings ? `${earnings.total}₽` : '...'}
                        </span>
                        <span className="amb-panel__counter-label">Всего</span>
                      </div>
                      <div className="amb-panel__counter">
                        <span className="amb-panel__counter-value">
                          {earnings ? `${earnings.level1}₽` : '...'}
                        </span>
                        <span className="amb-panel__counter-label">Уровень 1</span>
                      </div>
                      {earnings && earnings.level2 > 0 && (
                        <div className="amb-panel__counter">
                          <span className="amb-panel__counter-value amb-panel__counter-value--gold">
                            {earnings.level2}₽
                          </span>
                          <span className="amb-panel__counter-label">Уровень 2</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* История начислений */}
                {transactions && transactions.length > 0 && (
                  <div className="shop-profile__section">
                    <div className="amb-panel__referrals-title">История начислений</div>
                    <div className="amb-panel__referrals-list">
                      {(showAllTxns ? transactions : transactions.slice(0, 5)).map((t, i) => (
                        <div key={i} className="amb-panel__referral-item">
                          <div className="amb-panel__txn-row">
                            <span className="amb-panel__referral-name">{t.referral_name}</span>
                            <span className="amb-panel__txn-amount">+{t.commission_amount}₽</span>
                          </div>
                          <div className="amb-panel__txn-details">
                            <span>{t.commission_percent}% от {t.payment_amount}₽</span>
                            {t.level === 2 && <span className="amb-panel__referral-badge">LVL2</span>}
                            <span className="amb-panel__txn-date">
                              {new Date(t.date).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {transactions.length > 5 && (
                      <button
                        className="amb-panel__show-all"
                        onClick={() => setShowAllTxns(v => !v)}
                      >
                        {showAllTxns ? 'Свернуть' : `Все начисления (${transactions.length})`}
                      </button>
                    )}
                  </div>
                )}

                {/* Баланс */}
                <div className="shop-profile__section">
                  <div className="shop-profile__row">
                    <span className="shop-profile__label">Баланс к выплате:</span>
                    <span className="shop-profile__value" style={{ color: '#3CC8A1', fontWeight: 700 }}>
                      {earnings ? `${earnings.total}₽` : (profile?.balance_shc ? `${profile.balance_shc} SHC` : '0₽')}
                    </span>
                  </div>
                  <div className="shop-profile__hint">
                    Для вывода средств свяжитесь с администратором
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Рефералы + баланс SHC */}
                <div className="shop-profile__section">
                  <div className="shop-profile__referral-desc">
                    Приглашай друзей → получай <strong>20% от их подписки</strong> в SHC баллах → оплачивай до <strong>100%</strong> своего заказа
                  </div>
                  {profile?.balance_shc > 0 && (
                    <div className="shop-profile__shc-balance">
                      {profile.balance_shc} SHC = {profile.balance_shc}₽ скидки на следующий заказ
                    </div>
                  )}
                  <div className="amb-panel__counters">
                    <div className="amb-panel__counter">
                      <span className="amb-panel__counter-value">
                        {shcData ? shcData.friends_count : (referrals === null ? '...' : referrals?.referrals_count ?? 0)}
                      </span>
                      <span className="amb-panel__counter-label">Друзей</span>
                    </div>
                    <div className="amb-panel__counter">
                      <span className="amb-panel__counter-value" style={{ color: '#3CC8A1' }}>
                        {shcData ? shcData.total : (profile?.balance_shc || 0)}
                      </span>
                      <span className="amb-panel__counter-label">SHC</span>
                    </div>
                  </div>
                  {refLink && (
                    <>
                      <div className="shop-profile__partner-code-label">Ваша реферальная ссылка</div>
                      <div className="shop-profile__partner-code" style={{ fontSize: 12, wordBreak: 'break-all' }}>
                        sushi-house-39.ru/?invited_by={telegramId}
                      </div>
                      <div className="shop-profile__partner-code-actions">
                        <button className="shop-profile__invite-btn" onClick={handleCopyLink}>
                          {copiedLink ? 'Скопировано!' : 'Скопировать'}
                        </button>
                        <button className="shop-profile__invite-btn" onClick={handleShareLink}>
                          Поделиться
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* История SHC бонусов */}
                {bonuses && bonuses.length > 0 && (
                  <div className="shop-profile__section">
                    <div className="amb-panel__referrals-title">Начисления SHC</div>
                    <div className="amb-panel__referrals-list">
                      {(showAllBonuses ? bonuses : bonuses.slice(0, 5)).map((b, i) => (
                        <div key={i} className="amb-panel__referral-item">
                          <div className="amb-panel__txn-row">
                            <span className="amb-panel__referral-name">{b.referral_name}</span>
                            <span className="amb-panel__txn-amount">+{b.total_amount} SHC</span>
                          </div>
                          <div className="amb-panel__txn-details">
                            <span>{b.base_amount} базовых{b.threshold_bonus > 0 ? ` + ${b.threshold_bonus} бонус` : ''}</span>
                            <span className="amb-panel__txn-date">
                              {new Date(b.date).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {bonuses.length > 5 && (
                      <button
                        className="amb-panel__show-all"
                        onClick={() => setShowAllBonuses(v => !v)}
                      >
                        {showAllBonuses ? 'Свернуть' : `Все начисления (${bonuses.length})`}
                      </button>
                    )}
                  </div>
                )}

                <div className="shop-profile__section">
                  <div className="shop-profile__hint">
                    +50 SHC за каждого друга. Бонусы на порогах: 5, 10, 50, 100 друзей
                  </div>
                </div>
              </>
            )}

            {/* Автопродление */}
            <div className="shop-profile__section">
              <div className="shop-profile__row">
                <span className="shop-profile__label">♻️ Автопродление:</span>
                <span className="shop-profile__value" style={{ color: profile?.payment_method_id ? '#3CC8A1' : '#999' }}>
                  {profile?.payment_method_id ? 'активно' : 'отключено'}
                </span>
              </div>
              <div className="shop-profile__row">
                <span className="shop-profile__label">💳 Способ оплаты:</span>
                <span className="shop-profile__value">ЮKassa</span>
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
