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

  const { telegramId, loading: userLoading, profile, contactId, hasTag, tarif } = useUser();
  const [referrals, setReferrals] = useState(null);
  const [showTariffModal, setShowTariffModal] = useState(false);
  const [giftWindows, setGiftWindows] = useState(null);
  const [showAllReferrals, setShowAllReferrals] = useState(false);
  const [vipLoading, setVipLoading] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [showAllTxns, setShowAllTxns] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [orderHistory, setOrderHistory] = useState(null);
  const [priceTable, setPriceTable] = useState({
    '290':  { 1: 290,  3: 750,  5: 1200 },
    '490':  { 1: 690,  3: 1690, 5: 2990 },
    '1190': { 1: 1390, 3: 3850, 5: 6600 },
  });

  // Загружаем актуальные цены из API
  useEffect(() => {
    fetch('/api/admin/pricing')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.pricing) {
          const table = {};
          for (const [key, val] of Object.entries(data.pricing)) {
            table[key] = val.months || { 1: val.price };
          }
          setPriceTable(table);
        }
      })
      .catch(() => {});
  }, []);

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

  const TARIFF_INFO = {
    '290':  { label: '290 ₽/мес',  desc: 'Скидки 30% на роллы, 20% на сеты' },
    '490':  { label: '490 ₽/мес',  desc: 'Скидки + 2 ролла в подарок каждые 15 дней' },
    '1190': { label: '1190 ₽/мес', desc: 'Скидки + сет/мес + кофе' },
    '9990': { label: '9990 ₽',     desc: 'Амбассадор (разовый)' },
  };

  // Загружаем подарочные окна сразу при загрузке профиля
  useEffect(() => {
    if (!telegramId) return;
    fetch(`/api/get-gift-windows?telegram_id=${telegramId}`)
      .then(r => r.json())
      .then(data => { if (data.success) setGiftWindows(data.data); })
      .catch(() => {});
  }, [telegramId]);

  // Есть ли незабранный сет
  const hasUnclaimedSet = giftWindows?.windows?.some(
    w => w.status === 'available' && w.grantType === 'set'
  ) || false;

  // Дней до конца текущей подписки
  const daysLeft = (() => {
    if (!profile?.датаОКОНЧАНИЯ) return null;
    const parts = profile.датаОКОНЧАНИЯ.split('.');
    if (parts.length !== 3) return null;
    const end = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
    const diff = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  })();

  const handleTariffNavigate = (price, months) => {
    const params = new URLSearchParams();
    if (telegramId) params.set('telegram_id', telegramId);
    if (months && months > 1) params.set('months', months);
    const qs = params.toString() ? `?${params.toString()}` : '';
    window.location.href = `/pay/${price}${qs}`;
  };

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
      setOrderHistory([]);
      return;
    }
    fetch(`/api/get-order-history?telegram_id=${telegramId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setOrderHistory(data?.success ? data.orders : []); })
      .catch(() => setOrderHistory([]));
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
          <div className="shop-profile__header">🍣 КАБИНЕТ СУШИ-ХАУС 39</div>

          {/* Карточка 1: Профиль */}
          <div className="shop-profile__card">
            <div className="shop-profile__row">
              <span className="shop-profile__label">👤 Имя:</span>
              <span className="shop-profile__value" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {profile?.name || '—'}
                {tarif && (
                  <span className={`profile-tariff-badge${tarif === '9990' ? ' profile-tariff-badge--gold' : ''}`}>
                    {tarif === '9990' ? 'АМБА' : `${tarif} ₽`}
                  </span>
                )}
              </span>
            </div>
            <div className="shop-profile__row">
              <span className="shop-profile__label">📱 Контакт:</span>
              <span className="shop-profile__value">{formatPhone(profile?.phone)}</span>
            </div>
          </div>

          {/* Карточка 2: Подписка */}
          <div className="shop-profile__card">
            <div className="shop-profile__card-title">Подписка</div>
            <div className="shop-profile__row">
              <span className="shop-profile__label">📋 Статус:</span>
              <span className="shop-profile__value" style={{ color: profile?.статусСписания === 'активно' ? '#3CC8A1' : '#999' }}>
                {profile?.статусСписания || 'неактивно'}
              </span>
            </div>
            <div className="shop-profile__row">
              <span className="shop-profile__label">🔒 Действует до:</span>
              <span className="shop-profile__value">{profile?.датаОКОНЧАНИЯ || '—'}</span>
            </div>
            {(tarif === '490' || tarif === '1190') && giftWindows && (() => {
              const { currentStatus, daysLeft } = giftWindows;
              const type = tarif === '490' ? 'ролл' : 'сет';
              if (currentStatus === 'available') {
                return (
                  <div className="shop-profile__row">
                    <span className="shop-profile__label">🎁 Подарок:</span>
                    <span className="shop-profile__value" style={{ color: '#3CC8A1' }}>{type} доступен сейчас!</span>
                  </div>
                );
              }
              if ((currentStatus === 'claimed' || currentStatus === 'waiting') && daysLeft > 0) {
                return (
                  <div className="shop-profile__row">
                    <span className="shop-profile__label">🎁 Подарок:</span>
                    <span className="shop-profile__value" style={{ color: '#aaa' }}>через {daysLeft} дн.</span>
                  </div>
                );
              }
              return null;
            })()}
            {tarif && tarif !== '9990' && (
              <button
                onClick={() => setShowTariffModal(true)}
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: '11px 16px',
                  background: 'rgba(60,200,161,0.08)',
                  border: '1px solid rgba(60,200,161,0.4)',
                  borderRadius: 12,
                  color: '#3CC8A1',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                  boxShadow: '0 3px 14px rgba(60,200,161,0.22)',
                  transition: 'all 0.2s',
                }}
              >
                Изменить тариф / продлить →
              </button>
            )}
          </div>

          {/* Карточка 3: Автопродление */}
          <div className="shop-profile__card">
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

          {/* Карточка 4: История заказов */}
          <div className="shop-profile__card">
            <div className="shop-profile__card-title">История заказов</div>
            {orderHistory === null ? (
              <div style={{ color: '#888', fontSize: 13 }}>Загрузка...</div>
            ) : orderHistory.length === 0 ? (
              <div style={{ color: '#888', fontSize: 13 }}>Заказов пока не было</div>
            ) : (
              <ul className="profile-gift-list">
                {orderHistory.map((o, i) => {
                  let products = [];
                  try { products = JSON.parse(o.products_json || '[]'); } catch {}
                  const productNames = products.map(p => p.name).filter(Boolean).join(', ') || '—';
                  const date = o.created_at ? new Date(o.created_at).toLocaleDateString('ru-RU') : '—';
                  const typeLabel = o.order_type === 'gift' ? '🎁 Подарок' : '🏷 Со скидкой';
                  const deliveryLabel = o.delivery_type === 'delivery' ? '🚗 Доставка' : '🏪 Самовывоз';
                  return (
                    <li key={i} className="profile-gift-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span className="profile-gift-type" style={{ fontSize: 13 }}>{productNames}</span>
                        <span className="profile-gift-date">{date}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: o.order_type === 'gift' ? '#3CC8A1' : '#888' }}>{typeLabel}</span>
                        <span style={{ fontSize: 11, color: '#888' }}>{deliveryLabel}</span>
                        {o.total_price > 0 && <span style={{ fontSize: 11, color: '#888' }}>{o.total_price}₽</span>}
                      </div>
                      {o.address && <span className="profile-gift-address" style={{ fontSize: 11 }}>{o.address}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="shop-profile__section">
              <div className="shop-profile__row">
                <span className="shop-profile__label">⏰ Принимаем заказы:</span>
                <span className="shop-profile__value">с 10:00 до 21:50</span>
              </div>
            </div>
          </div>

          {/* Карточка 5: Реферальная программа */}
          <div className="shop-profile__card">
            {hasTag('амба') ? (
              <>
                <div className="shop-profile__ambassador-badge">АМБАССАДОР</div>

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
                <div className="shop-profile__card-title">Реферальная программа</div>
                <div className="shop-profile__referral-desc">
                  Приглашай друзей — получай <strong>20%</strong> от их подписки в SHC баллах. <strong>100%</strong> заказа оплачивается баллами: накопил 3000 баллов — получил роллов на <strong>3000 ₽</strong>
                </div>
                {profile?.balance_shc > 0 && (
                  <div className="shop-profile__shc-balance">
                    {profile.balance_shc} SHC = {profile.balance_shc}₽ скидки на следующий заказ
                  </div>
                )}
                <div className="amb-panel__counters" style={{ marginTop: 10 }}>
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
          </div>

          {/* Карточка 6: Кнопки */}
          <div className="shop-profile__card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
              <a className="shop-profile__link-btn" href="https://t.me/roman_chatbots" target="_blank" rel="noopener noreferrer">
                🛠 Техническая поддержка
              </a>
              <a className="shop-profile__link-btn shop-profile__link-btn--admin" href="https://t.me/romansonel" target="_blank" rel="noopener noreferrer">
                👨‍💼 Администратор
              </a>
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

      {/* Модалка выбора/смены тарифа */}
      {showTariffModal && (
        <>
          <div className="product-modal-overlay" onClick={() => setShowTariffModal(false)} />
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#1a1a2e',
            borderRadius: '20px 20px 0 0',
            padding: '16px 16px 40px',
            zIndex: 251,
            maxWidth: 480,
            margin: '0 auto',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
          }}>
            {/* Handle */}
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <span style={{ display: 'inline-block', width: 40, height: 4, background: '#333355', borderRadius: 2 }} />
            </div>
            <h3 style={{ color: '#eaeaf8', margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>Тарифы подписки</h3>
            {tarif && (
              <p style={{ color: '#8888aa', fontSize: 13, margin: '0 0 16px' }}>
                Текущий: {TARIFF_INFO[tarif]?.label}
              </p>
            )}

            {/* Повышение тарифа */}
            {['290', '490', '1190'].filter(t => Number(t) > Number(tarif)).map(t => (
              <button
                key={t}
                onClick={() => handleTariffNavigate(t)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 16px',
                  marginBottom: 10,
                  background: t === '1190' ? 'rgba(0,229,255,0.07)' : '#1e1e38',
                  border: t === '1190' ? '1px solid #00e5ff' : '1px solid #30305a',
                  borderRadius: 12,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ color: t === '1190' ? '#00e5ff' : '#eaeaf8', fontWeight: 700, fontSize: 15 }}>
                  {TARIFF_INFO[t]?.label}
                  {t === '1190' && <span style={{ fontSize: 11, marginLeft: 8, opacity: 0.8 }}>★ Лучший</span>}
                </div>
                <div style={{ color: '#8888aa', fontSize: 12, marginTop: 3 }}>{TARIFF_INFO[t]?.desc}</div>
              </button>
            ))}

            {/* Понижение тарифа для 1190 */}
            {tarif === '1190' && (
              <div style={{ marginTop: 10 }}>
                <div style={{ color: '#8888aa', fontSize: 12, marginBottom: 8 }}>↓ Перейти на более низкий тариф</div>
                {hasUnclaimedSet ? (
                  <div style={{
                    padding: '12px 14px',
                    background: 'rgba(255,150,0,0.08)',
                    border: '1px solid rgba(255,150,0,0.4)',
                    borderRadius: 12,
                    color: '#ffaa44',
                    fontSize: 13,
                  }}>
                    🎁 У вас есть не полученный сет. Получите его сначала — осталось {daysLeft !== null ? `${daysLeft} дн.` : 'несколько дней'}. После этого можно сменить тариф.
                  </div>
                ) : (
                  ['490', '290'].map(t => (
                    <button
                      key={t}
                      onClick={() => handleTariffNavigate(t)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '11px 16px',
                        marginBottom: 8,
                        background: '#1a1a2a',
                        border: '1px solid #30305a',
                        borderRadius: 12,
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ color: '#eaeaf8', fontWeight: 600, fontSize: 14 }}>{TARIFF_INFO[t]?.label}</div>
                      <div style={{ color: '#8888aa', fontSize: 12, marginTop: 2 }}>{TARIFF_INFO[t]?.desc}</div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Продление текущего — 1/3/5 месяцев */}
            {tarif && tarif !== '9990' && (
              <div style={{ marginTop: 4 }}>
                <div style={{ color: '#8888aa', fontSize: 12, marginBottom: 8 }}>↻ Продлить текущий тариф</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { months: 1, label: '1 мес' },
                    { months: 3, label: '3 мес' },
                    { months: 5, label: '5 мес' },
                  ].map(({ months, label }) => {
                    const price = priceTable[tarif]?.[months];
                    return (
                    <button
                      key={months}
                      onClick={() => handleTariffNavigate(tarif, months)}
                      style={{
                        flex: 1,
                        padding: '10px 4px',
                        background: 'rgba(60,200,161,0.07)',
                        border: '1px solid #3CC8A1',
                        borderRadius: 10,
                        color: '#3CC8A1',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        lineHeight: 1.3,
                      }}
                    >
                      <div>{label}</div>
                      {price && <div style={{ fontSize: 13, marginTop: 2 }}>{price} ₽</div>}
                    </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowTariffModal(false)}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px',
                marginTop: 14,
                background: 'transparent',
                border: '1px solid #30305a',
                borderRadius: 10,
                color: '#8888aa',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Закрыть
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ProfilePage;
