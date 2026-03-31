// src/AdminPage.js — Админка: товары + подписчики
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from './UserContext';

const API = '';

function AdminPage() {
  const { telegramId } = useUser();
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState('products');

  // Products state
  const [catalogs, setCatalogs] = useState([]);
  const [activeCatalog, setActiveCatalog] = useState('');
  const [productsLoading, setProductsLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // {catalogId, index, price}
  const [saving, setSaving] = useState(false);

  // Subscribers state
  const [subscribers, setSubscribers] = useState([]);
  const [stats, setStats] = useState(null);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsFilter, setSubsFilter] = useState('all');
  const [subsSearch, setSubsSearch] = useState('');
  const [grantingGift, setGrantingGift] = useState(null); // telegram_id пока идёт запрос
  const [grantTgId, setGrantTgId] = useState(''); // ввод telegram_id для выдачи подарка

  // Banners state
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(null);

  // Pricing state
  const [pricing, setPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);

  // Add user state
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addTariff, setAddTariff] = useState('290');
  const [addMonths, setAddMonths] = useState('1');
  const [addLoading, setAddLoading] = useState(false);
  const [addResult, setAddResult] = useState(null);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }), [token]);

  // Проверка токена при загрузке
  useEffect(() => {
    if (token) {
      fetch(`${API}/api/admin/products`, { headers: headers() })
        .then(r => { if (r.ok) setLoggedIn(true); else { setToken(''); localStorage.removeItem('admin_token'); } })
        .catch(() => { setToken(''); localStorage.removeItem('admin_token'); });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Логин
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        localStorage.setItem('admin_token', data.token);
        setLoggedIn(true);
      } else {
        setLoginError(data.error || 'Неверный пароль');
      }
    } catch {
      setLoginError('Ошибка соединения');
    }
  };

  // Загрузка товаров
  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/products`, { headers: headers() });
      const data = await res.json();
      if (data.success) {
        setCatalogs(data.catalogs);
        if (!activeCatalog && data.catalogs.length > 0) {
          setActiveCatalog(data.catalogs[0].id);
        }
      }
    } catch (err) {
      console.error('loadProducts error:', err);
    }
    setProductsLoading(false);
  }, [headers, activeCatalog]);

  // Загрузка подписчиков
  const loadSubscribers = useCallback(async () => {
    setSubsLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/subscribers`, { headers: headers() });
      const data = await res.json();
      if (data.success) {
        setSubscribers(data.subscribers);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('loadSubscribers error:', err);
    }
    setSubsLoading(false);
  }, [headers]);

  useEffect(() => {
    if (loggedIn && tab === 'products' && catalogs.length === 0) loadProducts();
    if (loggedIn && tab === 'subscribers' && subscribers.length === 0) loadSubscribers();
    if (loggedIn && tab === 'banners' && banners.length === 0) loadBanners();
    if (loggedIn && tab === 'pricing' && !pricing) loadPricing();
  }, [loggedIn, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Сохранение товара
  const saveItem = async (catalogId, index, updates) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/products`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ catalogId, itemIndex: index, ...updates }),
      });
      const data = await res.json();
      if (data.success) {
        // Обновляем локально
        setCatalogs(prev => prev.map(cat => {
          if (cat.id !== catalogId) return cat;
          return {
            ...cat,
            items: cat.items.map((item, i) => i === index ? { ...item, ...updates } : item),
          };
        }));
        setEditingItem(null);
      }
    } catch (err) {
      console.error('saveItem error:', err);
    }
    setSaving(false);
  };

  // Toggle enabled
  const toggleEnabled = (catalogId, index, currentEnabled) => {
    saveItem(catalogId, index, { enabled: !currentEnabled });
  };

  // Выдать подарок
  const grantGift = async (telegramId, type) => {
    setGrantingGift(telegramId + '+' + type);
    try {
      const res = await fetch(`${API}/api/admin/grant-gift`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ telegram_id: telegramId, type }),
      });
      const data = await res.json();
      if (data.success) loadSubscribers();
    } catch (err) {
      console.error('grantGift error:', err);
    }
    setGrantingGift(null);
  };

  // Отметить подарок полученным
  const claimGift = async (telegramId, type) => {
    setGrantingGift(telegramId + '-' + type);
    try {
      const res = await fetch(`${API}/api/admin/claim-gift`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ telegram_id: telegramId, type }),
      });
      const data = await res.json();
      if (data.success) loadSubscribers();
    } catch (err) {
      console.error('claimGift error:', err);
    }
    setGrantingGift(null);
  };

  // Загрузка цен
  const loadPricing = useCallback(async () => {
    setPricingLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/pricing`, { headers: headers() });
      const data = await res.json();
      if (data.success) setPricing(data.pricing);
    } catch (err) {
      console.error('loadPricing error:', err);
    }
    setPricingLoading(false);
  }, [headers]);

  const savePricing = async () => {
    setPricingSaving(true);
    try {
      await fetch(`${API}/api/admin/pricing`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ pricing }),
      });
    } catch (err) {
      console.error('savePricing error:', err);
    }
    setPricingSaving(false);
  };

  const updatePrice = (tarif, field, value) => {
    setPricing(prev => {
      const updated = { ...prev };
      if (field === 'price') {
        updated[tarif] = { ...updated[tarif], price: Number(value) || 0, months: { ...updated[tarif].months, 1: Number(value) || 0 } };
      } else {
        updated[tarif] = { ...updated[tarif], months: { ...updated[tarif].months, [field]: Number(value) || 0 } };
      }
      return updated;
    });
  };

  // Загрузка баннеров
  const loadBanners = useCallback(async () => {
    setBannersLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/banners`, { headers: headers() });
      const data = await res.json();
      if (data.success) setBanners(data.banners);
    } catch (err) {
      console.error('loadBanners error:', err);
    }
    setBannersLoading(false);
  }, [headers]);

  const cropToAspect = (file, ratio) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const targetW = img.width;
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(targetW, 1200);
      canvas.height = Math.round(canvas.width / ratio);
      const ctx = canvas.getContext('2d');
      // Центрируем обрезку по вертикали
      const srcH = Math.round(img.width / ratio);
      const srcY = Math.max(0, Math.round((img.height - srcH) / 2));
      ctx.drawImage(img, 0, srcY, img.width, srcH, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = URL.createObjectURL(file);
  });

  const uploadBanner = async (slot, file) => {
    setBannerUploading(slot);
    try {
      const imageData = await cropToAspect(file, 8 / 3);
      const res = await fetch(`${API}/api/admin/banners`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ slot, imageData }),
      });
      const data = await res.json();
      if (data.success) loadBanners();
    } catch (err) {
      console.error('uploadBanner error:', err);
    }
    setBannerUploading(null);
  };

  const addBannerSlot = async () => {
    const newId = banners.length > 0 ? Math.max(...banners.map(b => b.id)) + 1 : 1;
    if (newId > 7) return;
    const updated = [...banners, { id: newId, placeholder: true, color: '#f5f5f5' }];
    setBanners(updated);
    try {
      await fetch(`${API}/api/admin/banners`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ action: 'set-all', banners: updated }),
      });
    } catch {}
  };

  const removeBannerSlot = async () => {
    if (banners.length <= 1) return;
    const last = banners[banners.length - 1];
    // Удаляем файл если есть
    if (last.image) {
      try {
        await fetch(`${API}/api/admin/banners`, {
          method: 'DELETE',
          headers: headers(),
          body: JSON.stringify({ slot: last.id }),
        });
      } catch {}
    }
    const updated = banners.slice(0, -1);
    setBanners(updated);
    try {
      await fetch(`${API}/api/admin/banners`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ action: 'set-all', banners: updated }),
      });
    } catch {}
  };

  const deleteBanner = async (slot) => {
    setBannerUploading(slot);
    try {
      const res = await fetch(`${API}/api/admin/banners`, {
        method: 'DELETE',
        headers: headers(),
        body: JSON.stringify({ slot }),
      });
      const data = await res.json();
      if (data.success) loadBanners();
    } catch (err) {
      console.error('deleteBanner error:', err);
    }
    setBannerUploading(null);
  };

  const logout = () => {
    setToken('');
    setLoggedIn(false);
    localStorage.removeItem('admin_token');
  };

  const addUser = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddResult(null);
    try {
      const res = await fetch(`${API}/api/admin/add-user-manual`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          name: addName.trim() || undefined,
          phone: addPhone.trim(),
          tariff: addTariff,
          months: Number(addMonths),
        }),
      });
      const data = await res.json();
      setAddResult(data);
      if (data.success) {
        setAddPhone('');
        setAddName('');
        setAddTariff('290');
        setAddMonths('1');
      }
    } catch {
      setAddResult({ success: false, error: 'Ошибка соединения' });
    }
    setAddLoading(false);
  };

  // ─── Login screen ────────────────────────────────────
  if (!loggedIn) {
    return (
      <div style={styles.container}>
        <div style={styles.loginCard}>
          <h2 style={styles.title}>Админка Суши-Хаус 39</h2>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              autoFocus
            />
            <button type="submit" style={styles.btnPrimary}>Войти</button>
          </form>
          {loginError && <p style={styles.error}>{loginError}</p>}
          <button
            onClick={() => { window.location.href = telegramId ? `/discount-shop?telegram_id=${telegramId}` : '/discount-shop'; }}
            style={{ ...styles.btnSmall, marginTop: 16, width: '100%' }}
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  // ─── Main admin panel ────────────────────────────────
  const currentCatalog = catalogs.find(c => c.id === activeCatalog);

  const filteredSubs = subscribers.filter(s => {
    if (subsFilter !== 'all' && s.tariff !== subsFilter) return false;
    if (subsSearch) {
      const q = subsSearch.toLowerCase();
      return (s.name || '').toLowerCase().includes(q)
        || (s.phone || '').includes(q)
        || (s.telegram_id || '').includes(q);
    }
    return true;
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Админка</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { window.location.href = telegramId ? `/discount-shop?telegram_id=${telegramId}` : '/discount-shop'; }} style={styles.btnSmall}>Назад</button>
          <button onClick={logout} style={styles.btnSmall}>Выйти</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={tab === 'products' ? styles.tabActive : styles.tab}
          onClick={() => setTab('products')}
        >
          Товары
        </button>
        <button
          style={tab === 'subscribers' ? styles.tabActive : styles.tab}
          onClick={() => setTab('subscribers')}
        >
          Подписчики
        </button>
        <button
          style={tab === 'banners' ? styles.tabActive : styles.tab}
          onClick={() => setTab('banners')}
        >
          Баннеры
        </button>
        <button
          style={tab === 'pricing' ? styles.tabActive : styles.tab}
          onClick={() => setTab('pricing')}
        >
          Цены
        </button>
        <button
          style={tab === 'add' ? styles.tabActive : styles.tab}
          onClick={() => setTab('add')}
        >
          + Добавить
        </button>
      </div>

      {/* ─── Products Tab ─── */}
      {tab === 'products' && (
        <div>
          {/* Catalog selector */}
          <div style={styles.catalogTabs}>
            {catalogs.map(cat => (
              <button
                key={cat.id}
                style={activeCatalog === cat.id ? styles.catBtnActive : styles.catBtn}
                onClick={() => setActiveCatalog(cat.id)}
              >
                {cat.name} ({cat.itemCount})
              </button>
            ))}
          </div>

          {productsLoading && <p style={styles.muted}>Загрузка...</p>}

          {currentCatalog && (
            <div style={styles.productList}>
              {currentCatalog.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.productRow,
                    opacity: item.enabled ? 1 : 0.5,
                  }}
                >
                  <div style={styles.productInfo}>
                    <span style={styles.productName}>{item.name}</span>
                    {item.sku && <span style={styles.sku}>SKU: {item.sku}</span>}
                  </div>

                  <div style={styles.productActions}>
                    {editingItem?.catalogId === currentCatalog.id && editingItem?.index === idx ? (
                      <div style={styles.editRow}>
                        <input
                          type="number"
                          value={editingItem.price}
                          onChange={e => setEditingItem({ ...editingItem, price: e.target.value })}
                          style={styles.priceInput}
                          min="0"
                        />
                        <button
                          onClick={() => saveItem(currentCatalog.id, idx, { price: Number(editingItem.price) })}
                          style={styles.btnSave}
                          disabled={saving}
                        >
                          {saving ? '...' : 'OK'}
                        </button>
                        <button onClick={() => setEditingItem(null)} style={styles.btnCancel}>X</button>
                      </div>
                    ) : (
                      <span
                        style={styles.price}
                        onClick={() => setEditingItem({ catalogId: currentCatalog.id, index: idx, price: item.price })}
                        title="Нажмите для редактирования"
                      >
                        {item.price} &#8381;
                      </span>
                    )}

                    <button
                      style={item.enabled ? styles.toggleOn : styles.toggleOff}
                      onClick={() => toggleEnabled(currentCatalog.id, idx, item.enabled)}
                      disabled={saving}
                    >
                      {item.enabled ? 'ВКЛ' : 'ВЫКЛ'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={loadProducts} style={{ ...styles.btnSmall, marginTop: 16 }} disabled={productsLoading}>
            Обновить
          </button>
        </div>
      )}

      {/* ─── Subscribers Tab ─── */}
      {tab === 'subscribers' && (
        <div>
          <div style={styles.grantRow}>
            <input
              type="text"
              placeholder="telegram_id"
              value={grantTgId}
              onChange={e => setGrantTgId(e.target.value)}
              style={styles.grantInput}
            />
            <button style={styles.grantBtn} onClick={() => { if (grantTgId.trim()) grantGift(grantTgId.trim(), 'roll'); }} disabled={!!grantingGift || !grantTgId.trim()}>+R</button>
            <button style={styles.claimBtn} onClick={() => { if (grantTgId.trim()) claimGift(grantTgId.trim(), 'roll'); }} disabled={!!grantingGift || !grantTgId.trim()}>-R</button>
            <button style={styles.grantBtn} onClick={() => { if (grantTgId.trim()) grantGift(grantTgId.trim(), 'set'); }} disabled={!!grantingGift || !grantTgId.trim()}>+S</button>
            <button style={styles.claimBtn} onClick={() => { if (grantTgId.trim()) claimGift(grantTgId.trim(), 'set'); }} disabled={!!grantingGift || !grantTgId.trim()}>-S</button>
          </div>

          {stats && (
            <div style={styles.statsRow}>
              <span style={styles.statBadge}>Всего: {stats.total}</span>
              {Object.entries(stats.by_tariff).map(([t, count]) => (
                <span key={t} style={styles.statBadge}>{t}&#8381;: {count}</span>
              ))}
              <span style={styles.statBadge}>Активных: {stats.active}</span>
              <span style={styles.statBadge}>Амбассадоров: {stats.ambassadors}</span>
            </div>
          )}

          <div style={styles.filterRow}>
            <select value={subsFilter} onChange={e => setSubsFilter(e.target.value)} style={styles.select}>
              <option value="all">Все тарифы</option>
              <option value="290">290</option>
              <option value="490">490</option>
              <option value="1190">1190</option>
              <option value="9990">9990 (Амбассадор)</option>
            </select>
            <input
              type="text"
              placeholder="Поиск по имени, телефону, ID..."
              value={subsSearch}
              onChange={e => setSubsSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {subsLoading && <p style={styles.muted}>Загрузка...</p>}

          <div style={styles.subsCount}>Показано: {filteredSubs.length}</div>

          <div style={styles.subsList}>
            {filteredSubs.map(s => (
              <div key={s.telegram_id} style={styles.subRow}>
                <div style={styles.subMain}>
                  <span style={styles.subName}>{s.name || 'Без имени'}</span>
                  <span style={styles.tariffBadge(s.tariff)}>{s.tariff}&#8381;</span>
                  {s.is_ambassador ? <span style={styles.ambBadge}>AMB</span> : null}
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                    <button style={styles.grantBtn} onClick={() => grantGift(s.telegram_id, 'roll')} disabled={!!grantingGift}>
                      {grantingGift === s.telegram_id + '+roll' ? '...' : '+R'}
                    </button>
                    <button style={styles.claimBtn} onClick={() => claimGift(s.telegram_id, 'roll')} disabled={!!grantingGift}>
                      {grantingGift === s.telegram_id + '-roll' ? '...' : '-R'}
                    </button>
                    <button style={styles.grantBtn} onClick={() => grantGift(s.telegram_id, 'set')} disabled={!!grantingGift}>
                      {grantingGift === s.telegram_id + '+set' ? '...' : '+S'}
                    </button>
                    <button style={styles.claimBtn} onClick={() => claimGift(s.telegram_id, 'set')} disabled={!!grantingGift}>
                      {grantingGift === s.telegram_id + '-set' ? '...' : '-S'}
                    </button>
                  </span>
                </div>
                <div style={styles.subDetails}>
                  {s.phone && <span>Tel: {s.phone}</span>}
                  <span>ID: {s.telegram_id}</span>
                  {s.subscription_start && <span>C {s.subscription_start}</span>}
                  {s.subscription_end && <span>По {s.subscription_end}</span>}
                  {s.subscription_status && (
                    <span style={{
                      color: s.subscription_status === 'активно' ? '#3CC8A1' : '#ff6b6b'
                    }}>
                      {s.subscription_status}
                    </span>
                  )}
                  {s.balance_shc > 0 && <span>SHC: {s.balance_shc}</span>}
                </div>
                {/* Подарки */}
                {s.gifts && (
                  <div style={styles.giftsRow}>
                    <span style={styles.giftsSummary}>
                      Подарки: {s.gifts.claimed}/{s.gifts.totalWindows} получено
                    </span>
                    {s.gifts.lastClaimed && (
                      <span style={styles.giftsLast}>Последний: {s.gifts.lastClaimed}</span>
                    )}
                    {s.gifts.windows && s.gifts.windows.some(w => w.claimedAt) && (
                      <div style={styles.giftsWindows}>
                        {s.gifts.windows.filter(w => w.claimedAt).map(w => (
                          <span key={w.num} style={styles.giftClaimed}>
                            #{w.num} {w.claimedAt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button onClick={loadSubscribers} style={{ ...styles.btnSmall, marginTop: 16 }} disabled={subsLoading}>
            Обновить
          </button>
        </div>
      )}

      {/* ─── Banners Tab ─── */}
      {tab === 'banners' && (
        <div>
          {bannersLoading && <p style={styles.muted}>Загрузка...</p>}

          <div style={{ padding: '8px 10px', background: '#e3f2fd', borderRadius: 10, marginBottom: 10, fontSize: 11, color: '#555', lineHeight: 1.5 }}>
            Рекомендуемый размер: <b style={{ color: '#333' }}>1200×450 px</b> (соотношение 8:3).
            Картинка будет автоматически обрезана по центру до нужных пропорций.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {banners.map((banner, idx) => {
              const slot = banner.id;
              const hasImage = banner && banner.image;
              return (
                <div key={slot} style={styles.bannerSlot}>
                  <div style={styles.bannerHeader}>
                    <span style={{ color: '#333', fontSize: 13, fontWeight: 600 }}>Баннер {slot}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <label style={styles.grantBtn}>
                        {bannerUploading === slot ? '...' : 'Загрузить'}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={e => { if (e.target.files[0]) uploadBanner(slot, e.target.files[0]); }}
                          disabled={bannerUploading === slot}
                        />
                      </label>
                      {hasImage && (
                        <button style={styles.claimBtn} onClick={() => deleteBanner(slot)} disabled={!!bannerUploading}>
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Ссылка (опционально)"
                    value={banner.link || ''}
                    onChange={e => {
                      const updated = banners.map(b => b.id === slot ? { ...b, link: e.target.value } : b);
                      setBanners(updated);
                    }}
                    onBlur={() => {
                      fetch(`${API}/api/admin/banners`, {
                        method: 'POST',
                        headers: headers(),
                        body: JSON.stringify({ action: 'set-all', banners }),
                      }).catch(() => {});
                    }}
                    style={{ ...styles.grantInput, marginBottom: 8, fontSize: 12 }}
                  />
                  <div style={styles.bannerPreview}>
                    {hasImage ? (
                      <img src={banner.image + '?v=' + Date.now()} alt="" style={styles.bannerImg} />
                    ) : (
                      <div style={{ ...styles.bannerEmpty, background: banner?.color || '#f5f5f5' }}>
                        Пустой слот
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {banners.length < 7 && (
              <button style={styles.grantBtn} onClick={addBannerSlot} disabled={!!bannerUploading}>
                + Добавить слот
              </button>
            )}
            {banners.length > 1 && (
              <button style={styles.claimBtn} onClick={removeBannerSlot} disabled={!!bannerUploading}>
                − Удалить последний
              </button>
            )}
            <button onClick={loadBanners} style={styles.btnSmall} disabled={bannersLoading}>
              Обновить
            </button>
          </div>
        </div>
      )}

      {/* ─── Pricing Tab ─── */}
      {tab === 'pricing' && (
        <div>
          {pricingLoading && <p style={styles.muted}>Загрузка...</p>}

          {pricing && Object.entries(pricing).map(([tarif, data]) => (
            <div key={tarif} style={{ ...styles.bannerSlot, marginBottom: 12 }}>
              <div style={{ color: '#333', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                Тариф {tarif}₽ {tarif === '9990' ? '(Амбассадор)' : ''}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={styles.priceField}>
                  <label style={styles.priceLabel}>1 мес</label>
                  <input
                    type="number"
                    value={data.months?.[1] || data.price || ''}
                    onChange={e => updatePrice(tarif, 'price', e.target.value)}
                    style={styles.priceInput2}
                  />
                </div>
                {tarif !== '9990' && (
                  <>
                    <div style={styles.priceField}>
                      <label style={styles.priceLabel}>3 мес</label>
                      <input
                        type="number"
                        value={data.months?.[3] || ''}
                        onChange={e => updatePrice(tarif, '3', e.target.value)}
                        style={styles.priceInput2}
                      />
                    </div>
                    <div style={styles.priceField}>
                      <label style={styles.priceLabel}>5 мес</label>
                      <input
                        type="number"
                        value={data.months?.[5] || ''}
                        onChange={e => updatePrice(tarif, '5', e.target.value)}
                        style={styles.priceInput2}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          <button
            style={styles.btnPrimary}
            onClick={savePricing}
            disabled={pricingSaving}
          >
            {pricingSaving ? 'Сохранение...' : 'Сохранить цены'}
          </button>
        </div>
      )}

      {/* ─── Add User Tab ─── */}
      {tab === 'add' && (
        <div>
          <div style={styles.addCard}>
            <h3 style={styles.addTitle}>Добавить пользователя</h3>
            <form onSubmit={addUser}>
              <label style={styles.fieldLabel}>Имя (необязательно)</label>
              <input
                type="text"
                placeholder="Имя клиента"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                style={styles.input}
              />

              <label style={styles.fieldLabel}>Телефон *</label>
              <input
                type="tel"
                placeholder="+7 900 000 00 00"
                value={addPhone}
                onChange={e => setAddPhone(e.target.value)}
                style={styles.input}
                required
              />

              <label style={styles.fieldLabel}>Тариф *</label>
              <select
                value={addTariff}
                onChange={e => setAddTariff(e.target.value)}
                style={styles.input}
              >
                <option value="290">290 ₽ — Скидки 30/20%</option>
                <option value="490">490 ₽ — Скидки + бесплатные роллы</option>
                <option value="1190">1190 ₽ — Скидки + сеты + кофе</option>
                <option value="9990">9990 ₽ — Амбассадор</option>
              </select>

              <label style={styles.fieldLabel}>Период подписки *</label>
              <select
                value={addMonths}
                onChange={e => setAddMonths(e.target.value)}
                style={{ ...styles.input, marginBottom: 18 }}
              >
                <option value="1">1 месяц</option>
                <option value="2">2 месяца</option>
                <option value="3">3 месяца</option>
                <option value="6">6 месяцев</option>
                <option value="12">12 месяцев</option>
              </select>

              <button
                type="submit"
                style={styles.btnPrimary}
                disabled={addLoading || !addPhone.trim()}
              >
                {addLoading ? 'Добавление...' : 'Добавить пользователя'}
              </button>
            </form>

            {addResult && (
              <div style={{
                marginTop: 14,
                padding: '12px 14px',
                borderRadius: 10,
                background: addResult.success ? '#e8f5e9' : '#fce8e8',
                color: addResult.success ? '#2e7d32' : '#c62828',
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 700, marginBottom: addResult.success ? 8 : 0 }}>
                  {addResult.success ? '✓ ' : '✗ '}{addResult.message || addResult.error}
                </div>
                {addResult.success && addResult.user && (
                  <div style={{ fontSize: 12, color: '#555', lineHeight: 1.7 }}>
                    <div><b>Имя:</b> {addResult.user.name}</div>
                    <div><b>Телефон:</b> {addResult.user.phone}</div>
                    <div><b>Тариф:</b> {addResult.user.tariff} ₽</div>
                    <div><b>Период:</b> {addResult.user.subscription_start} — {addResult.user.subscription_end}</div>
                    <div style={{ color: '#999', marginTop: 2 }}>ID: {addResult.user.telegram_id}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles (светлая тема, mobile-first) ─────────────
const styles = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: 12,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#333',
    background: '#f5f5f5',
    minHeight: '100vh',
  },
  loginCard: {
    maxWidth: 320,
    margin: '100px auto',
    padding: 28,
    background: '#fff',
    borderRadius: 16,
    textAlign: 'center',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  title: { color: '#222', margin: '0 0 14px', fontSize: 18 },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: '#f9f9f9',
    border: '1px solid #ddd',
    borderRadius: 10,
    color: '#333',
    fontSize: 15,
    boxSizing: 'border-box',
    marginBottom: 10,
  },
  btnPrimary: {
    width: '100%',
    padding: '11px 20px',
    background: '#3CC8A1',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSmall: {
    padding: '6px 14px',
    background: '#e8e8e8',
    color: '#555',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    cursor: 'pointer',
  },
  error: { color: '#e53935', marginTop: 10, fontSize: 13 },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 12,
    overflowX: 'auto',
  },
  tab: {
    padding: '8px 0',
    background: 'transparent',
    color: '#999',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: 13,
    cursor: 'pointer',
    flex: 1,
    whiteSpace: 'nowrap',
    textAlign: 'center',
  },
  tabActive: {
    padding: '8px 0',
    background: 'transparent',
    color: '#3CC8A1',
    border: 'none',
    borderBottom: '2px solid #3CC8A1',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    flex: 1,
    whiteSpace: 'nowrap',
    textAlign: 'center',
  },
  catalogTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  catBtn: {
    padding: '5px 10px',
    background: '#fff',
    color: '#888',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 11,
    cursor: 'pointer',
  },
  catBtnActive: {
    padding: '5px 10px',
    background: '#e8f8f2',
    color: '#3CC8A1',
    border: '1px solid #3CC8A1',
    borderRadius: 8,
    fontSize: 11,
    cursor: 'pointer',
    fontWeight: 600,
  },
  muted: { color: '#aaa', fontSize: 13 },
  productList: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
  },
  productRow: {
    display: 'flex',
    flexDirection: 'column',
    padding: '8px 10px',
    background: '#fff',
    borderRadius: 10,
    gap: 4,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  productInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minWidth: 0,
  },
  productName: { fontSize: 12, color: '#333', wordBreak: 'break-word', fontWeight: 500 },
  sku: { fontSize: 10, color: '#aaa' },
  productActions: { display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' },
  price: {
    fontSize: 13,
    fontWeight: 700,
    color: '#3CC8A1',
    cursor: 'pointer',
  },
  editRow: { display: 'flex', gap: 4, alignItems: 'center' },
  priceInput: {
    width: 60,
    padding: '4px 6px',
    background: '#f0f0f0',
    border: '1px solid #3CC8A1',
    borderRadius: 6,
    color: '#333',
    fontSize: 13,
    textAlign: 'right',
  },
  btnSave: {
    padding: '4px 8px',
    background: '#3CC8A1',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
  },
  btnCancel: {
    padding: '4px 6px',
    background: '#e8e8e8',
    color: '#888',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
  },
  toggleOn: {
    padding: '3px 8px',
    background: '#e8f8f2',
    color: '#2a9d6e',
    border: '1px solid #3CC8A1',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    minWidth: 36,
  },
  toggleOff: {
    padding: '3px 8px',
    background: '#fce8e8',
    color: '#e53935',
    border: '1px solid #f5a5a5',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    minWidth: 36,
  },
  // Subscribers
  statsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  statBadge: {
    padding: '3px 10px',
    background: '#fff',
    borderRadius: 10,
    fontSize: 12,
    color: '#666',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  },
  filterRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  select: {
    padding: '7px 10px',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 8,
    color: '#333',
    fontSize: 13,
  },
  searchInput: {
    flex: 1,
    minWidth: 140,
    padding: '7px 10px',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 8,
    color: '#333',
    fontSize: 13,
  },
  subsCount: { fontSize: 12, color: '#aaa', marginBottom: 6 },
  subsList: { display: 'flex', flexDirection: 'column', gap: 6 },
  subRow: {
    padding: '10px',
    background: '#fff',
    borderRadius: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  subMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  subName: { fontSize: 13, color: '#333', fontWeight: 600 },
  tariffBadge: (tariff) => ({
    padding: '2px 7px',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 600,
    background: tariff === '9990' ? '#fff3cd' : tariff === '1190' ? '#d1ecf1' : tariff === '490' ? '#d4edda' : '#e9ecef',
    color: tariff === '9990' ? '#856404' : tariff === '1190' ? '#0c5460' : tariff === '490' ? '#155724' : '#666',
  }),
  ambBadge: {
    padding: '2px 5px',
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 700,
    background: '#fff3cd',
    color: '#856404',
  },
  subDetails: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    fontSize: 11,
    color: '#999',
  },
  // Gifts
  giftsRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTop: '1px solid #eee',
  },
  giftsSummary: {
    fontSize: 11,
    color: '#0c5460',
    marginRight: 8,
  },
  giftsLast: {
    fontSize: 11,
    color: '#999',
  },
  giftsWindows: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  giftClaimed: {
    padding: '2px 6px',
    background: '#d4edda',
    borderRadius: 4,
    fontSize: 10,
    color: '#155724',
  },
  grantRow: {
    display: 'flex',
    gap: 4,
    marginBottom: 10,
    alignItems: 'center',
  },
  grantInput: {
    flex: 1,
    padding: '7px 10px',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 8,
    color: '#333',
    fontSize: 13,
  },
  grantBtn: {
    padding: '6px 8px',
    background: '#e3f2fd',
    color: '#1565c0',
    border: '1px solid #bbdefb',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  claimBtn: {
    padding: '6px 8px',
    background: '#fce8e8',
    color: '#c62828',
    border: '1px solid #f5a5a5',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  // Banners
  bannerSlot: {
    background: '#fff',
    borderRadius: 12,
    padding: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  bannerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bannerPreview: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  bannerImg: {
    width: '100%',
    height: 'auto',
    display: 'block',
    borderRadius: 8,
  },
  bannerEmpty: {
    width: '100%',
    aspectRatio: '8/3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    background: '#f0f0f0',
    color: '#bbb',
    fontSize: 13,
  },
  // Pricing
  priceField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    flex: 1,
    minWidth: 70,
  },
  priceLabel: {
    fontSize: 11,
    color: '#999',
  },
  priceInput2: {
    padding: '8px 8px',
    background: '#f9f9f9',
    border: '1px solid #ddd',
    borderRadius: 8,
    color: '#333',
    fontSize: 15,
    fontWeight: 600,
    textAlign: 'center',
    width: '100%',
    boxSizing: 'border-box',
  },
  // Add User
  addCard: {
    background: '#fff',
    borderRadius: 14,
    padding: 18,
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
  },
  addTitle: {
    margin: '0 0 16px',
    fontSize: 15,
    fontWeight: 700,
    color: '#222',
  },
  fieldLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
};

export default AdminPage;
