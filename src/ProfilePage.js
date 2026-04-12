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

  // === State ===
  const [referrals, setReferrals] = useState(null);
  const [tariffAction, setTariffAction] = useState(null); // 'extend' | 'upgrade' | 'downgrade'
  const [giftWindows, setGiftWindows] = useState(null);
  const [showAllReferrals, setShowAllReferrals] = useState(false);
  const [vipLoading, setVipLoading] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [showAllTxns, setShowAllTxns] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [orderHistory, setOrderHistory] = useState(null);
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [priceTable, setPriceTable] = useState({
    '290':  { 1: 290,  3: 750,  5: 1200 },
    '490':  { 1: 690,  3: 1690, 5: 2990 },
    '1190': { 1: 1390, 3: 3850, 5: 6600 },
  });
  const [shcData, setShcData] = useState(null);
  const [bonuses, setBonuses] = useState(null);
  const [showAllBonuses, setShowAllBonuses] = useState(false);
  const [showShcInfo, setShowShcInfo] = useState(false);

  // === Constants ===
  const TARIFF_INFO = {
    '290':  { label: '290 ₽/мес',  desc: 'Скидка 30% на все роллы и запечённые, 20% на сеты.' },
    '490':  { label: '690 ₽/мес',  desc: 'Все скидки + 2 ролла в подарок каждые 15 дней.' },
    '1190': { label: '1390 ₽/мес', desc: 'Все скидки + роллы + 1 сет каждые 30 дней + кофе. Лучший вариант.' },
    '9990': { label: '9990 ₽',     desc: 'Амбассадор — разовый платёж.' },
  };

  const toggleSection = (key) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // === Effects ===
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

  useEffect(() => {
    if (!telegramId && !contactId) {
      if (!userLoading) setReferrals({ referrals_count: 0, ambassadors_count: 0, referrals: [] });
      return;
    }
    const body = telegramId ? { telegram_id: telegramId } : { contact_id: contactId };
    fetch('/api/get-referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(r => r.ok ? r.json() : null)
      .then(refData => setReferrals(refData || { referrals_count: 0, ambassadors_count: 0, referrals: [] }))
      .catch(() => setReferrals({ referrals_count: 0, ambassadors_count: 0, referrals: [] }));
  }, [telegramId, contactId, userLoading]);

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
    if (!telegramId) return;
    fetch(`/api/get-gift-windows?telegram_id=${telegramId}`)
      .then(r => r.json())
      .then(data => { if (data.success) setGiftWindows(data.data); })
      .catch(() => {});
  }, [telegramId]);

  useEffect(() => {
    if (!telegramId) { setOrderHistory([]); return; }
    fetch(`/api/get-order-history?telegram_id=${telegramId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setOrderHistory(data?.success ? data.orders : []))
      .catch(() => setOrderHistory([]));
  }, [telegramId]);

  // === Computed ===
  const hasUnclaimedSet = giftWindows?.windows?.some(
    w => w.status === 'available' && w.grantType === 'set'
  ) || false;

  const daysLeft = (() => {
    if (!profile?.датаОКОНЧАНИЯ) return null;
    const parts = profile.датаОКОНЧАНИЯ.split('.');
    if (parts.length !== 3) return null;
    const end = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
    const diff = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  })();

  const subProgress = (() => {
    if (!profile?.датаНАЧАЛА || !profile?.датаОКОНЧАНИЯ) return null;
    const parse = (s) => { const [d, m, y] = s.split('.'); return new Date(`${y}-${m}-${d}T00:00:00`); };
    const start = parse(profile.датаНАЧАЛА);
    const end = parse(profile.датаОКОНЧАНИЯ);
    const total = end - start;
    if (total <= 0) return 100;
    return Math.min(100, Math.max(0, ((new Date() - start) / total) * 100));
  })();

  const isActive = profile?.статусСписания === 'активно';
  const isAmb = hasTag('амба');
  const refLink = telegramId ? `https://sushi-house-39.ru/?invited_by=${telegramId}` : null;

  const giftInfo = (() => {
    if (!giftWindows || (tarif !== '490' && tarif !== '1190')) return null;
    const { currentStatus, daysLeft: giftDays } = giftWindows;
    const type = tarif === '490' ? 'ролл' : 'сет';
    if (currentStatus === 'available') return { available: true, type };
    if ((currentStatus === 'claimed' || currentStatus === 'waiting') && giftDays > 0) return { available: false, type, daysLeft: giftDays };
    return null;
  })();

  const friendsCount = shcData ? shcData.friends_count : (referrals?.referrals_count ?? null);
  const shcTotal = shcData ? shcData.total : (profile?.balance_shc || 0);
  const hasFriends = friendsCount !== null && friendsCount > 0;

  // === Handlers ===
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
    window.location.href = telegramId ? `/discount-shop?telegram_id=${telegramId}` : '/discount-shop';
  };

  const handleTariffNavigate = (price, months) => {
    const params = new URLSearchParams();
    if (telegramId) params.set('telegram_id', telegramId);
    if (months && months > 1) params.set('months', months);
    const qs = params.toString() ? `?${params.toString()}` : '';
    window.location.href = `/pay/${price}${qs}`;
  };

  const formatPhone = (raw) => {
    if (!raw) return '—';
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 11) return `+${digits[0]} (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7,9)}-${digits.slice(9)}`;
    if (digits.length === 10) return `+7 (${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,8)}-${digits.slice(8)}`;
    return `+${digits}`;
  };

  const pluralDays = (n) => {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 19) return 'дней';
    if (mod10 === 1) return 'день';
    if (mod10 >= 2 && mod10 <= 4) return 'дня';
    return 'дней';
  };

  const tariffBadgeLabel = { '290': '290 ₽', '490': '690 ₽', '1190': '1390 ₽', '9990': 'АМБА' };
  const error = !userLoading && !telegramId ? 'Telegram ID не найден' : null;

  return (
    <div className="shop-page">
      <header className="shop-header">
        <button className="shop-header__back" onClick={handleBack}>←</button>
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
        <div className="pf-page">

          {/* ── БЛОК 1: HERO ─────────────────────── */}
          <div className="pf-hero">
            <div className="pf-hero__identity">
              <div className="pf-hero__name-row">
                <span className="pf-hero__name">{profile?.name || '—'}</span>
                {tarif && (
                  <span className={`pf-tariff-badge${tarif === '9990' ? ' pf-tariff-badge--gold' : ''}`}>
                    {tariffBadgeLabel[tarif] || tarif}
                  </span>
                )}
              </div>
              {profile?.phone && (
                <div className="pf-hero__phone">{formatPhone(profile.phone)}</div>
              )}
            </div>

            {/* Амбассадор */}
            {isAmb && (
              <div className="pf-amb">
                <div className="pf-amb__badge">АМБАССАДОР</div>
                <div className="pf-counters">
                  <div className="pf-counter">
                    <span className="pf-counter__value">{referrals === null ? '…' : referrals.referrals_count}</span>
                    <span className="pf-counter__label">Рефералов</span>
                  </div>
                  <div className="pf-counter">
                    <span className="pf-counter__value pf-counter__value--gold">{referrals === null ? '…' : referrals.ambassadors_count}</span>
                    <span className="pf-counter__label">Амбассадоров</span>
                  </div>
                  <div className="pf-counter">
                    <span className="pf-counter__value pf-counter__value--green">{earnings ? `${earnings.total}₽` : '…'}</span>
                    <span className="pf-counter__label">Заработок</span>
                  </div>
                </div>
                {(() => {
                  const ambCount = referrals?.ambassadors_count || 0;
                  const isUnlocked = ambCount >= 10;
                  return (
                    <div className="pf-level2">
                      <div className="pf-level2__header">
                        <span>Уровень 2</span>
                        <span className={`pf-level2__status${isUnlocked ? ' pf-level2__status--open' : ''}`}>
                          {isUnlocked ? 'Открыт ✓' : `${ambCount} / 10 амб.`}
                        </span>
                      </div>
                      <div className="pf-progress-bar">
                        <div className="pf-progress-bar__fill pf-progress-bar__fill--gold" style={{ width: `${Math.min(ambCount / 10, 1) * 100}%` }} />
                      </div>
                      {!isUnlocked && (
                        <div className="pf-level2__hint">Ещё {10 - ambCount} амбассадоров до +5% с их рефералов</div>
                      )}
                    </div>
                  );
                })()}
                {refLink && (
                  <div className="pf-reflink">
                    <div className="pf-reflink__label">Ваша реферальная ссылка</div>
                    <div className="pf-reflink__url">sushi-house-39.ru/?invited_by={telegramId}</div>
                    <div className="pf-reflink__btns">
                      <button className="pf-reflink__btn" onClick={handleCopyLink}>{copiedLink ? '✓ Скопировано' : 'Скопировать'}</button>
                      <button className="pf-reflink__btn" onClick={handleShareLink}>Поделиться</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Обычный пользователь с подпиской */}
            {!isAmb && tarif && tarif !== '9990' && (
              <div className="pf-hero__sub">
                {profile?.датаОКОНЧАНИЯ && (
                  <>
                    <div className="pf-hero__sub-until">
                      {isActive ? `Подписка до ${profile.датаОКОНЧАНИЯ}` : `Истекла ${profile.датаОКОНЧАНИЯ}`}
                    </div>
                    {subProgress !== null && (
                      <div className="pf-progress-bar pf-progress-bar--sub">
                        <div className={`pf-progress-bar__fill${isActive ? '' : ' pf-progress-bar__fill--expired'}`} style={{ width: `${subProgress}%` }} />
                      </div>
                    )}
                    {daysLeft !== null && isActive && (
                      <div className="pf-hero__days-left">
                        {daysLeft === 0 ? 'Последний день' : `${daysLeft} ${pluralDays(daysLeft)} осталось`}
                      </div>
                    )}
                  </>
                )}

                {giftInfo && (
                  <div className={`pf-gift-banner${giftInfo.available ? ' pf-gift-banner--available' : ''}`}>
                    {giftInfo.available
                      ? `🎁 ${giftInfo.type === 'ролл' ? 'Ролл' : 'Сет'} в подарок — доступен сейчас!`
                      : `🎁 Подарок: ${giftInfo.type} через ${giftInfo.daysLeft} ${pluralDays(giftInfo.daysLeft)}`}
                  </div>
                )}

                <button className="pf-hero__cta" onClick={() => setTariffAction('extend')}>
                  Продлить за {priceTable[tarif]?.[1] || '—'} ₽
                </button>

                <div className="pf-hero__secondary">
                  {['290', '490', '1190'].some(t => Number(t) > Number(tarif)) && (
                    <button className="pf-hero__sec-btn" onClick={() => setTariffAction('upgrade')}>Повысить тариф</button>
                  )}
                  {tarif !== '290' && (
                    <button className="pf-hero__sec-btn" onClick={() => setTariffAction('downgrade')}>Понизить</button>
                  )}
                </div>
              </div>
            )}

            {/* Нет подписки */}
            {!isAmb && !tarif && (
              <div className="pf-hero__sub">
                <div className="pf-hero__no-sub">Подписка не оформлена</div>
                <button className="pf-hero__cta" onClick={() => setTariffAction('upgrade')}>
                  Оформить подписку →
                </button>
              </div>
            )}

            {/* Автопродление — строка */}
            {profile && (
              <div className="pf-hero__autorenewal">
                <span>♻️ Автопродление:</span>
                <span style={{ color: profile.payment_method_id ? '#3CC8A1' : '#666', fontWeight: 600 }}>
                  {profile.payment_method_id ? 'активно' : 'отключено'}
                </span>
              </div>
            )}
          </div>

          {/* ── БЛОК 2: SHC И РЕФЕРАЛЬНАЯ ПРОГРАММА ─ */}
          {!isAmb && (
            <div className="pf-shc">
              <div className="pf-shc__title">💎 SHC баллы</div>

              {hasFriends && (
                <div className="pf-counters">
                  <div className="pf-counter">
                    <span className="pf-counter__value pf-counter__value--green">{shcTotal}</span>
                    <span className="pf-counter__label">SHC</span>
                  </div>
                  <div className="pf-counter">
                    <span className="pf-counter__value">{friendsCount}</span>
                    <span className="pf-counter__label">{friendsCount === 1 ? 'друг' : 'друзей'}</span>
                  </div>
                </div>
              )}

              {shcTotal > 0 && (
                <div className="pf-shc__prog">
                  <div className="pf-progress-bar">
                    <div className="pf-progress-bar__fill" style={{ width: `${Math.min(100, (shcTotal / 3000) * 100)}%` }} />
                  </div>
                  <div className="pf-shc__prog-label">
                    {shcTotal >= 3000
                      ? `${shcTotal} SHC = ${shcTotal} ₽ скидки на следующий заказ`
                      : `${shcTotal} / 3000 SHC — ещё ${3000 - shcTotal} до скидки`}
                  </div>
                </div>
              )}

              <div className="pf-shc__desc">
                Пригласи друга — получи <strong>20%</strong> от его подписки в SHC баллах
              </div>

              {refLink && (
                <div className="pf-reflink">
                  <div className="pf-reflink__url">sushi-house-39.ru/?invited_by={telegramId}</div>
                  <div className="pf-reflink__btns">
                    <button className="pf-reflink__btn pf-reflink__btn--primary" onClick={handleCopyLink}>
                      {copiedLink ? '✓ Скопировано' : 'Скопировать ссылку'}
                    </button>
                    <button className="pf-reflink__btn" onClick={handleShareLink}>Поделиться</button>
                  </div>
                </div>
              )}

              <button className="pf-shc__info-link" onClick={() => setShowShcInfo(true)}>
                ⓘ Как работает система SHC?
              </button>
            </div>
          )}

          {/* ── БЛОК 3: БЫСТРЫЕ ДЕЙСТВИЯ (2×2) ───── */}
          <div className="pf-quick">
            <button
              className="pf-quick__btn"
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
                    const link = data.is_member ? data.chat_link : data.invite_link;
                    if (link) {
                      const tg = window.Telegram?.WebApp;
                      if (tg?.openTelegramLink) tg.openTelegramLink(link);
                      else window.open(link, '_blank');
                    } else {
                      alert(data.error || 'Не удалось получить ссылку');
                    }
                  })
                  .catch(() => alert('Ошибка проверки подписки'))
                  .finally(() => setVipLoading(false));
              }}
            >
              {vipLoading ? '⏳' : '🔗'} VIP-клуб
            </button>
            <button
              className="pf-quick__btn"
              onClick={() => { window.location.href = telegramId ? `/settings?telegram_id=${telegramId}` : '/settings'; }}
            >
              ⚙️ Настройки
            </button>
            <a className="pf-quick__btn" href="https://t.me/roman_chatbots" target="_blank" rel="noopener noreferrer">
              💬 Поддержка
            </a>
            <a className="pf-quick__btn" href="https://t.me/romansonel" target="_blank" rel="noopener noreferrer">
              👨‍💼 Администратор
            </a>
          </div>

          {/* ── БЛОК 4: АККОРДЕОН ─────────────────── */}
          <div className="pf-accordion">

            {/* История заказов */}
            <div className="pf-accordion__item">
              <button className="pf-accordion__hdr" onClick={() => toggleSection('orders')}>
                <span>История заказов{orderHistory && orderHistory.length > 0 ? ` (${orderHistory.length})` : ''}</span>
                <span className="pf-accordion__arrow">{expandedSections.has('orders') ? '▾' : '▸'}</span>
              </button>
              {expandedSections.has('orders') && (
                <div className="pf-accordion__body">
                  {orderHistory === null ? (
                    <div className="pf-accordion__empty">Загрузка...</div>
                  ) : orderHistory.length === 0 ? (
                    <div className="pf-accordion__empty">Заказов пока не было</div>
                  ) : (
                    <ul className="pf-orders">
                      {orderHistory.map((o, i) => {
                        let products = [];
                        try { products = JSON.parse(o.products_json || '[]'); } catch {}
                        const productNames = products.map(p => p.name).filter(Boolean).join(', ') || '—';
                        const date = o.created_at ? new Date(o.created_at).toLocaleDateString('ru-RU') : '—';
                        const typeLabel = o.order_type === 'gift' ? '🎁 Подарок' : '🏷 Со скидкой';
                        const deliveryLabel = o.delivery_type === 'delivery' ? '🚗 Доставка' : '🏪 Самовывоз';
                        return (
                          <li key={i} className="pf-order">
                            <div className="pf-order__top">
                              <span className="pf-order__name">{productNames}</span>
                              <span className="pf-order__date">{date}</span>
                            </div>
                            <div className="pf-order__meta">
                              <span className={o.order_type === 'gift' ? 'pf-order__tag--gift' : 'pf-order__tag'}>{typeLabel}</span>
                              <span className="pf-order__tag">{deliveryLabel}</span>
                              {o.total_price > 0 && <span className="pf-order__tag">{o.total_price} ₽</span>}
                            </div>
                            {o.address && <div className="pf-order__addr">{o.address}</div>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Начисления SHC */}
            {bonuses && bonuses.length > 0 && (
              <div className="pf-accordion__item">
                <button className="pf-accordion__hdr" onClick={() => toggleSection('shc')}>
                  <span>Начисления SHC ({bonuses.length})</span>
                  <span className="pf-accordion__arrow">{expandedSections.has('shc') ? '▾' : '▸'}</span>
                </button>
                {expandedSections.has('shc') && (
                  <div className="pf-accordion__body">
                    {(showAllBonuses ? bonuses : bonuses.slice(0, 5)).map((b, i) => (
                      <div key={i} className="pf-txn">
                        <div className="pf-txn__top">
                          <span className="pf-txn__name">{b.referral_name}</span>
                          <span className="pf-txn__amount">+{b.total_amount} SHC</span>
                        </div>
                        <div className="pf-txn__meta">
                          <span>{b.achievement || `${b.base_amount} SHC`}</span>
                          <span>{new Date(b.date).toLocaleDateString('ru-RU')}</span>
                        </div>
                      </div>
                    ))}
                    {bonuses.length > 5 && (
                      <button className="pf-accordion__more" onClick={() => setShowAllBonuses(v => !v)}>
                        {showAllBonuses ? 'Свернуть' : `Показать все (${bonuses.length})`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Амбассадор: история начислений ₽ */}
            {isAmb && transactions && transactions.length > 0 && (
              <div className="pf-accordion__item">
                <button className="pf-accordion__hdr" onClick={() => toggleSection('transactions')}>
                  <span>История начислений ({transactions.length})</span>
                  <span className="pf-accordion__arrow">{expandedSections.has('transactions') ? '▾' : '▸'}</span>
                </button>
                {expandedSections.has('transactions') && (
                  <div className="pf-accordion__body">
                    {(showAllTxns ? transactions : transactions.slice(0, 5)).map((t, i) => (
                      <div key={i} className="pf-txn">
                        <div className="pf-txn__top">
                          <span className="pf-txn__name">{t.referral_name}</span>
                          <span className="pf-txn__amount">+{t.commission_amount} ₽</span>
                        </div>
                        <div className="pf-txn__meta">
                          <span>{t.commission_percent}% от {t.payment_amount} ₽</span>
                          {t.level === 2 && <span className="pf-badge">LVL2</span>}
                          <span>{new Date(t.date).toLocaleDateString('ru-RU')}</span>
                        </div>
                      </div>
                    ))}
                    {transactions.length > 5 && (
                      <button className="pf-accordion__more" onClick={() => setShowAllTxns(v => !v)}>
                        {showAllTxns ? 'Свернуть' : `Показать все (${transactions.length})`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Амбассадор: приглашённые */}
            {isAmb && referrals && referrals.referrals.length > 0 && (
              <div className="pf-accordion__item">
                <button className="pf-accordion__hdr" onClick={() => toggleSection('referrals')}>
                  <span>Приглашённые ({referrals.referrals_count})</span>
                  <span className="pf-accordion__arrow">{expandedSections.has('referrals') ? '▾' : '▸'}</span>
                </button>
                {expandedSections.has('referrals') && (
                  <div className="pf-accordion__body">
                    {(showAllReferrals ? referrals.referrals : referrals.referrals.slice(0, 5)).map((r, i) => (
                      <div key={i} className="pf-txn pf-txn--row">
                        <span className="pf-txn__name">{r.name}</span>
                        {r.is_ambassador && <span className="pf-badge pf-badge--gold">AMB</span>}
                      </div>
                    ))}
                    {referrals.referrals.length > 5 && (
                      <button className="pf-accordion__more" onClick={() => setShowAllReferrals(v => !v)}>
                        {showAllReferrals ? 'Свернуть' : `Показать всех (${referrals.referrals_count})`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Режим работы */}
            <div className="pf-accordion__item pf-accordion__item--static">
              <div className="pf-accordion__hdr pf-accordion__hdr--static">
                <span style={{ color: '#888' }}>⏰ Принимаем заказы</span>
                <span style={{ color: '#3CC8A1', fontWeight: 700 }}>10:00 – 21:50</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── МОДАЛКА: ПРОДЛИТЬ ─────────────────── */}
      {tariffAction === 'extend' && tarif && (
        <>
          <div className="product-modal-overlay" onClick={() => setTariffAction(null)} />
          <div className="pf-modal">
            <div className="pf-modal__handle" />
            <div className="pf-modal__title">Продлить тариф</div>
            <div className="pf-modal__subtitle">{TARIFF_INFO[tarif]?.label}</div>
            <div className="pf-modal__months">
              {[1, 3, 5].map(months => {
                const price = priceTable[tarif]?.[months];
                const base = priceTable[tarif]?.[1];
                const savings = months > 1 && price && base ? Math.round((1 - price / (base * months)) * 100) : 0;
                return (
                  <button key={months} className="pf-modal__month-btn" onClick={() => handleTariffNavigate(tarif, months)}>
                    <div className="pf-modal__month-top">{months} {months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'}</div>
                    <div className="pf-modal__month-price">{price ? `${price} ₽` : '—'}</div>
                    {savings > 0 && <div className="pf-modal__month-save">−{savings}%</div>}
                  </button>
                );
              })}
            </div>
            <button className="pf-modal__close" onClick={() => setTariffAction(null)}>Закрыть</button>
          </div>
        </>
      )}

      {/* ── МОДАЛКА: ПОВЫСИТЬ ─────────────────── */}
      {tariffAction === 'upgrade' && (
        <>
          <div className="product-modal-overlay" onClick={() => setTariffAction(null)} />
          <div className="pf-modal">
            <div className="pf-modal__handle" />
            <div className="pf-modal__title">{tarif ? 'Повысить тариф' : 'Оформить подписку'}</div>
            {['290', '490', '1190'].filter(t => !tarif || Number(t) > Number(tarif)).map(t => (
              <button key={t} className={`pf-modal__tariff-btn${t === '1190' ? ' pf-modal__tariff-btn--best' : ''}`} onClick={() => handleTariffNavigate(t)}>
                <div className="pf-modal__tariff-row">
                  <span className="pf-modal__tariff-name">{TARIFF_INFO[t]?.label}</span>
                  {t === '1190' && <span className="pf-modal__tariff-star">★ Лучший</span>}
                </div>
                <div className="pf-modal__tariff-desc">{TARIFF_INFO[t]?.desc}</div>
              </button>
            ))}
            <button className="pf-modal__close" onClick={() => setTariffAction(null)}>Закрыть</button>
          </div>
        </>
      )}

      {/* ── МОДАЛКА: ПОНИЗИТЬ ─────────────────── */}
      {tariffAction === 'downgrade' && (
        <>
          <div className="product-modal-overlay" onClick={() => setTariffAction(null)} />
          <div className="pf-modal">
            <div className="pf-modal__handle" />
            <div className="pf-modal__title">Понизить тариф</div>
            {tarif === '1190' && hasUnclaimedSet ? (
              <div className="pf-modal__warn">
                🎁 У вас есть не полученный сет. Получите его сначала —{' '}
                осталось {daysLeft !== null ? `${daysLeft} дн.` : 'несколько дней'}.{' '}
                После этого можно сменить тариф.
              </div>
            ) : (
              <>
                <div className="pf-modal__warn pf-modal__warn--soft">
                  ⚠️ Вы потеряете часть преимуществ текущего тарифа
                </div>
                {['490', '290'].filter(t => Number(t) < Number(tarif)).map(t => (
                  <button key={t} className="pf-modal__tariff-btn" onClick={() => handleTariffNavigate(t)}>
                    <div className="pf-modal__tariff-name">{TARIFF_INFO[t]?.label}</div>
                    <div className="pf-modal__tariff-desc">{TARIFF_INFO[t]?.desc}</div>
                  </button>
                ))}
              </>
            )}
            <button className="pf-modal__close" onClick={() => setTariffAction(null)}>Закрыть</button>
          </div>
        </>
      )}

      {/* ── МОДАЛКА: КАК РАБОТАЕТ SHC ─────────── */}
      {showShcInfo && (
        <>
          <div className="product-modal-overlay" onClick={() => setShowShcInfo(false)} />
          <div className="pf-modal pf-modal--scroll">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#3CC8A1', margin: 0, fontSize: 16, fontWeight: 700 }}>Система SHC баллов</h3>
              <button onClick={() => setShowShcInfo(false)} style={{ background: 'transparent', border: 'none', color: '#8888aa', fontSize: 20, cursor: 'pointer', padding: 4 }}>✕</button>
            </div>
            <div style={{ fontSize: 13, color: '#8888aa', lineHeight: 1.8 }}>
              <p style={{ color: '#eaeaf8', fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Как зарабатывать SHC</p>
              <p style={{ marginTop: 0, marginBottom: 12 }}>Поделись своей реферальной ссылкой с другом. Когда он оплатит подписку — тебе автоматически начислится <strong style={{ color: '#3CC8A1' }}>20% от суммы его платежа</strong> в SHC баллах.</p>
              <p style={{ color: '#eaeaf8', fontWeight: 700, marginBottom: 6 }}>Примеры начислений</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>• Друг оплатил 290 ₽ → тебе <strong style={{ color: '#3CC8A1' }}>58 SHC</strong></p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>• Друг оплатил 690 ₽ → тебе <strong style={{ color: '#3CC8A1' }}>138 SHC</strong></p>
              <p style={{ marginTop: 0, marginBottom: 12 }}>• Друг оплатил 1 390 ₽ → тебе <strong style={{ color: '#3CC8A1' }}>278 SHC</strong></p>
              <p style={{ color: '#eaeaf8', fontWeight: 700, marginBottom: 6 }}>Как тратить SHC</p>
              <p style={{ marginTop: 0, marginBottom: 12 }}>1 SHC = 1 ₽ скидки на заказ. Минимальный порог — <strong style={{ color: '#3CC8A1' }}>3 000 SHC</strong>. Можно оплатить до <strong style={{ color: '#3CC8A1' }}>100%</strong> стоимости заказа.</p>
              <p style={{ color: '#eaeaf8', fontWeight: 700, marginBottom: 6 }}>Как пригласить друга</p>
              <p style={{ marginTop: 0, marginBottom: 0 }}>Скопируй свою реферальную ссылку и отправь другу. После его регистрации и оплаты баллы зачисляются автоматически.</p>
            </div>
            <button className="pf-modal__close" onClick={() => setShowShcInfo(false)}>Закрыть</button>
          </div>
        </>
      )}
    </div>
  );
}

export default ProfilePage;
