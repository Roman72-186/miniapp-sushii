// src/AdminPage.js — Админка: товары + подписчики
import React, { useState, useEffect, useCallback } from 'react';

const API = '';

function AdminPage() {
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

  const logout = () => {
    setToken('');
    setLoggedIn(false);
    localStorage.removeItem('admin_token');
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
            onClick={() => { window.location.href = '/discount-shop'; }}
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
          <button onClick={() => { window.location.href = '/discount-shop'; }} style={styles.btnSmall}>Назад</button>
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
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────
const styles = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: 16,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#e0e0e0',
    background: '#1a1a2e',
    minHeight: '100vh',
  },
  loginCard: {
    maxWidth: 320,
    margin: '120px auto',
    padding: 32,
    background: '#16213e',
    borderRadius: 12,
    textAlign: 'center',
  },
  title: { color: '#fff', margin: '0 0 16px', fontSize: 20 },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: '#0f3460',
    border: '1px solid #333',
    borderRadius: 8,
    color: '#fff',
    fontSize: 16,
    boxSizing: 'border-box',
    marginBottom: 12,
  },
  btnPrimary: {
    width: '100%',
    padding: '12px 24px',
    background: '#3CC8A1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSmall: {
    padding: '6px 16px',
    background: '#333',
    color: '#ccc',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
  error: { color: '#ff6b6b', marginTop: 12 },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    padding: '10px 24px',
    background: '#16213e',
    color: '#888',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    cursor: 'pointer',
    flex: 1,
  },
  tabActive: {
    padding: '10px 24px',
    background: '#3CC8A1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    flex: 1,
  },
  catalogTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  catBtn: {
    padding: '6px 12px',
    background: '#16213e',
    color: '#888',
    border: '1px solid #333',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
  },
  catBtnActive: {
    padding: '6px 12px',
    background: '#0f3460',
    color: '#3CC8A1',
    border: '1px solid #3CC8A1',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 600,
  },
  muted: { color: '#666', fontSize: 14 },
  productList: { display: 'flex', flexDirection: 'column', gap: 4 },
  productRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    background: '#16213e',
    borderRadius: 8,
    gap: 8,
  },
  productInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  productName: { fontSize: 14, color: '#e0e0e0', wordBreak: 'break-word' },
  sku: { fontSize: 11, color: '#666' },
  productActions: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  price: {
    fontSize: 14,
    fontWeight: 600,
    color: '#3CC8A1',
    cursor: 'pointer',
    minWidth: 60,
    textAlign: 'right',
  },
  editRow: { display: 'flex', gap: 4, alignItems: 'center' },
  priceInput: {
    width: 70,
    padding: '4px 8px',
    background: '#0f3460',
    border: '1px solid #3CC8A1',
    borderRadius: 4,
    color: '#fff',
    fontSize: 14,
    textAlign: 'right',
  },
  btnSave: {
    padding: '4px 10px',
    background: '#3CC8A1',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
    cursor: 'pointer',
  },
  btnCancel: {
    padding: '4px 8px',
    background: '#444',
    color: '#ccc',
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
    cursor: 'pointer',
  },
  toggleOn: {
    padding: '4px 10px',
    background: '#2a5e4a',
    color: '#3CC8A1',
    border: '1px solid #3CC8A1',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    minWidth: 42,
  },
  toggleOff: {
    padding: '4px 10px',
    background: '#5e2a2a',
    color: '#ff6b6b',
    border: '1px solid #ff6b6b',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    minWidth: 42,
  },
  // Subscribers
  statsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statBadge: {
    padding: '4px 12px',
    background: '#16213e',
    borderRadius: 12,
    fontSize: 13,
    color: '#aaa',
  },
  filterRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  select: {
    padding: '8px 12px',
    background: '#16213e',
    border: '1px solid #333',
    borderRadius: 6,
    color: '#e0e0e0',
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    minWidth: 200,
    padding: '8px 12px',
    background: '#16213e',
    border: '1px solid #333',
    borderRadius: 6,
    color: '#e0e0e0',
    fontSize: 14,
  },
  subsCount: { fontSize: 13, color: '#666', marginBottom: 8 },
  subsList: { display: 'flex', flexDirection: 'column', gap: 4 },
  subRow: {
    padding: '10px 12px',
    background: '#16213e',
    borderRadius: 8,
  },
  subMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  subName: { fontSize: 14, color: '#e0e0e0', fontWeight: 500 },
  tariffBadge: (tariff) => ({
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    background: tariff === '9990' ? '#5e4a2a' : tariff === '1190' ? '#2a4a5e' : tariff === '490' ? '#2a5e4a' : '#3a3a3a',
    color: tariff === '9990' ? '#ffd700' : tariff === '1190' ? '#64b5f6' : tariff === '490' ? '#3CC8A1' : '#aaa',
  }),
  ambBadge: {
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 700,
    background: '#5e4a2a',
    color: '#ffd700',
  },
  subDetails: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    fontSize: 12,
    color: '#888',
  },
  // Gifts
  giftsRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTop: '1px solid #2a2a4a',
  },
  giftsSummary: {
    fontSize: 12,
    color: '#64b5f6',
    marginRight: 12,
  },
  giftsLast: {
    fontSize: 12,
    color: '#888',
  },
  giftsWindows: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  giftClaimed: {
    padding: '2px 8px',
    background: '#2a4a2a',
    borderRadius: 4,
    fontSize: 11,
    color: '#3CC8A1',
  },
};

export default AdminPage;
