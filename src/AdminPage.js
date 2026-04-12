// src/AdminPage.js — Админка: товары + подписчики
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from './UserContext';

// Подключаем Montserrat через Google Fonts
if (typeof document !== 'undefined' && !document.getElementById('montserrat-font')) {
  const link = document.createElement('link');
  link.id = 'montserrat-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
}

const API = '';

function AdminPage() {
  const { telegramId } = useUser();
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState('products');
  const [group, setGroup] = useState('content');

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
  const [resettingSub, setResettingSub] = useState(null); // telegram_id пока идёт сброс подписки
  const [settingTariff, setSettingTariff] = useState(null); // telegram_id пока идёт смена тарифа
  const [extendingDays, setExtendingDays] = useState({}); // {telegram_id: '5'}
  const [extending, setExtending] = useState(null); // telegram_id пока идёт продление
  // inline смена тарифа с датой: { telegram_id, tariff, end_date }
  const [subEdit, setSubEdit] = useState(null);
  const [editingNotes, setEditingNotes] = useState({}); // {telegram_id: 'текст'}
  const [dashStats, setDashStats] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [giftOrders, setGiftOrders] = useState(null);
  const [giftOrdersLoading, setGiftOrdersLoading] = useState(false);
  const [giftOrdersSearch, setGiftOrdersSearch] = useState('');

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
  const [addGiftRolls, setAddGiftRolls] = useState(0);
  const [addGiftSets, setAddGiftSets] = useState(0);
  const [addEndDate, setAddEndDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addResult, setAddResult] = useState(null);

  // Add product state
  const [newCatId, setNewCatId] = useState('rolls');
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [newAddToSub, setNewAddToSub] = useState(false);
  const [newSubSku, setNewSubSku] = useState('');
  const [newProductLoading, setNewProductLoading] = useState(false);
  const [newProductResult, setNewProductResult] = useState(null);

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
    if (loggedIn && tab === 'stats') loadStats();
    if (loggedIn && tab === 'orders') loadGiftOrders();
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

  // Сброс подписки
  const resetSubscription = async (telegramId, name) => {
    if (!window.confirm(`Сбросить подписку пользователя "${name || telegramId}"?\nОн увидит экран оплаты при следующем входе.`)) return;
    setResettingSub(telegramId);
    try {
      const res = await fetch(`${API}/api/admin/reset-subscription`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ telegram_id: telegramId }),
      });
      const data = await res.json();
      if (data.success) loadSubscribers();
    } catch (err) {
      console.error('resetSubscription error:', err);
    }
    setResettingSub(null);
  };

  // Смена тарифа
  const setTariff = async (telegramId, tariff) => {
    setSettingTariff(telegramId);
    try {
      const res = await fetch(`${API}/api/admin/user-tags`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ telegram_id: telegramId, action: 'add', tag: tariff }),
      });
      const data = await res.json();
      if (data.success) loadSubscribers();
    } catch (err) {
      console.error('setTariff error:', err);
    }
    setSettingTariff(null);
  };

  // Смена тарифа + дата окончания
  const applySubscription = async () => {
    if (!subEdit) return;
    setSettingTariff(subEdit.telegram_id);
    try {
      const res = await fetch(`${API}/api/admin/set-subscription`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ telegram_id: subEdit.telegram_id, tariff: subEdit.tariff, end_date: subEdit.end_date }),
      });
      const data = await res.json();
      if (data.success) { loadSubscribers(); setSubEdit(null); }
    } catch (err) {
      console.error('applySubscription error:', err);
    }
    setSettingTariff(null);
  };

  const defaultEndDate = () => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };

  // Продление подписки на N дней
  const extendSub = async (telegramId) => {
    const days = Number(extendingDays[telegramId]);
    if (!days || days < 1) return;
    setExtending(telegramId);
    try {
      const res = await fetch(`${API}/api/admin/extend-subscription`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ telegram_id: telegramId, days }),
      });
      const data = await res.json();
      if (data.success) { loadSubscribers(); setExtendingDays(prev => ({ ...prev, [telegramId]: '' })); }
    } catch (err) { console.error('extendSub error:', err); }
    setExtending(null);
  };

  // Сохранить заметку
  const saveNotes = async (telegramId, notes) => {
    try {
      await fetch(`${API}/api/admin/user-notes`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ telegram_id: telegramId, notes }),
      });
    } catch (err) { console.error('saveNotes error:', err); }
  };

  // Загрузка статистики
  const loadStats = useCallback(async () => {
    setDashLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/stats`, { headers: headers() });
      const data = await res.json();
      if (data.success) setDashStats(data.stats);
    } catch (_) {}
    setDashLoading(false);
  }, [headers]);

  // Загрузка заказов подарков
  const loadGiftOrders = useCallback(async () => {
    setGiftOrdersLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/gift-orders`, { headers: headers() });
      const data = await res.json();
      if (data.success) setGiftOrders(data.orders);
    } catch (_) {}
    setGiftOrdersLoading(false);
  }, [headers]);

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

  // Коэффициенты скидок (из базового тарифа 290: 750/290 и 1200/290)
  const MONTH_RATIO_3 = 750 / 290;  // ~2.586 → −13.8% от полной цены
  const MONTH_RATIO_5 = 1200 / 290; // ~4.138 → −17.2% от полной цены

  const updatePrice = (tarif, field, value) => {
    const numVal = Number(value) || 0;
    setPricing(prev => {
      const updated = { ...prev };
      if (field === 'price') {
        const months = { ...updated[tarif].months, 1: numVal };
        if (tarif !== '9990') {
          months[3] = Math.round(numVal * MONTH_RATIO_3 / 10) * 10;
          months[5] = Math.round(numVal * MONTH_RATIO_5 / 10) * 10;
        }
        updated[tarif] = { ...updated[tarif], price: numVal, months };
      } else {
        updated[tarif] = { ...updated[tarif], months: { ...updated[tarif].months, [field]: numVal } };
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

  const handleNewProductImage = async (file) => {
    const imageData = await cropToAspect(file, 1);
    setNewImagePreview(imageData);
  };

  const isGiftCat = (catId) => catId === 'gift-roll' || catId === 'gift-set';

  const addProduct = async (e) => {
    e.preventDefault();
    setNewProductLoading(true);
    setNewProductResult(null);
    try {
      const res = await fetch(`${API}/api/admin/add-product`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          categoryId: newCatId,
          name: newName.trim(),
          sku: newSku.trim(),
          ...(!isGiftCat(newCatId) ? { price: Number(newPrice) } : {}),
          description: newDesc.trim() || undefined,
          imageData: newImagePreview || undefined,
          ...(!isGiftCat(newCatId) ? { addToSub: newAddToSub, subSku: newSubSku.trim() || undefined } : {}),
        }),
      });
      const data = await res.json();
      setNewProductResult(data);
      if (data.success) {
        setNewName(''); setNewSku(''); setNewPrice('');
        setNewDesc(''); setNewImagePreview(null);
        setNewAddToSub(false); setNewSubSku('');
      }
    } catch {
      setNewProductResult({ success: false, error: 'Ошибка соединения' });
    }
    setNewProductLoading(false);
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
          end_date: addEndDate,
          gift_rolls: Number(addGiftRolls) || 0,
          gift_sets: Number(addGiftSets) || 0,
        }),
      });
      const data = await res.json();
      setAddResult(data);
      if (data.success) {
        setAddPhone('');
        setAddName('');
        setAddTariff('290');
        setAddGiftRolls(0);
        setAddGiftSets(0);
        const d = new Date(); d.setDate(d.getDate() + 30);
        setAddEndDate(d.toISOString().split('T')[0]);
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

      {/* Навигация — 2 группы + суб-табы */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        {[
          { id: 'content', label: '📦 Контент', defaultTab: 'products' },
          { id: 'people',  label: '👥 Люди',    defaultTab: 'subscribers' },
        ].map(g => (
          <button
            key={g.id}
            style={group === g.id ? styles.groupTabActive : styles.groupTab}
            onClick={() => { setGroup(g.id); setTab(g.defaultTab); }}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div style={styles.subTabs}>
        {(group === 'content'
          ? [{ id: 'products', label: '⬡ Товары' }, { id: 'banners', label: '▣ Баннеры' }, { id: 'pricing', label: '◎ Цены' }, { id: 'add-product', label: '⊕ Добавить' }]
          : [{ id: 'subscribers', label: '◈ Подписчики' }, { id: 'orders', label: '◷ Заказы' }, { id: 'add', label: '⊕ Добавить' }, { id: 'stats', label: '◉ Статистика' }]
        ).map(({ id, label }) => (
          <button
            key={id}
            style={tab === id ? styles.subTabActive : styles.subTab}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
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
                    <button style={styles.resetSubBtn} onClick={() => resetSubscription(s.telegram_id, s.name)} disabled={!!resettingSub}>
                      {resettingSub === s.telegram_id ? '...' : 'RST'}
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
                {(s.referrals_count > 0 || Number(s.shc_earned) > 0 || s.invited_by) && (
                  <div style={styles.refRow}>
                    {s.referrals_count > 0 && <span>👥 {s.referrals_count} реф.</span>}
                    {Number(s.shc_earned) > 0 && <span>💎 {Math.round(s.shc_earned)} SHC</span>}
                    {s.invited_by && (
                      <span style={{ color: AP.muted }}>
                        ↑ {s.invited_by_name || s.invited_by}
                      </span>
                    )}
                  </div>
                )}
                <div style={styles.tariffRow}>
                  {['290', '490', '1190'].map(t => (
                    <button
                      key={t}
                      style={s.tariff === t ? styles.tariffBtnActive : styles.tariffBtnInactive}
                      onClick={() => setSubEdit(
                        subEdit?.telegram_id === s.telegram_id && subEdit?.tariff === t
                          ? null
                          : { telegram_id: s.telegram_id, tariff: t, end_date: defaultEndDate() }
                      )}
                      disabled={!!settingTariff}
                    >
                      {settingTariff === s.telegram_id ? '...' : t}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1" max="365"
                    placeholder="дн."
                    value={extendingDays[s.telegram_id] || ''}
                    onChange={e => setExtendingDays(prev => ({ ...prev, [s.telegram_id]: e.target.value }))}
                    style={styles.daysInput}
                  />
                  <button
                    style={styles.extendBtn}
                    onClick={() => extendSub(s.telegram_id)}
                    disabled={!!extending || !extendingDays[s.telegram_id]}
                  >
                    {extending === s.telegram_id ? '...' : '+Дн'}
                  </button>
                </div>
                {/* Inline форма смены тарифа + даты */}
                {subEdit?.telegram_id === s.telegram_id && (
                  <div style={styles.subEditRow}>
                    <span style={{ color: CP.cyan, fontSize: 11, fontWeight: 700 }}>
                      Тариф {subEdit.tariff}₽ до:
                    </span>
                    <input
                      type="date"
                      value={subEdit.end_date}
                      onChange={e => setSubEdit(prev => ({ ...prev, end_date: e.target.value }))}
                      style={styles.dateInput}
                    />
                    <button style={styles.applyBtn} onClick={applySubscription} disabled={!!settingTariff}>
                      {settingTariff === s.telegram_id ? '...' : '✓'}
                    </button>
                    <button style={styles.btnCancel} onClick={() => setSubEdit(null)}>✕</button>
                  </div>
                )}
                <div style={styles.notesRow}>
                  <input
                    type="text"
                    placeholder="Заметка..."
                    defaultValue={s.notes || ''}
                    key={s.telegram_id + '_notes'}
                    onBlur={e => { if (e.target.value !== (s.notes || '')) saveNotes(s.telegram_id, e.target.value); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); } }}
                    style={styles.notesInput}
                  />
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
                            #{w.num} {w.claimedAt}{w.address ? ` — ${w.address}` : ''}
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

          <div style={{ padding: '8px 10px', background: 'rgba(60,200,161,0.08)', borderRadius: 10, marginBottom: 10, fontSize: 11, color: '#9fb0c3', lineHeight: 1.5, border: '1px solid rgba(60,200,161,0.2)' }}>
            Рекомендуемый размер: <b style={{ color: '#3CC8A1' }}>1200×450 px</b> (соотношение 8:3).
            Картинка будет автоматически обрезана по центру до нужных пропорций.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {banners.map((banner, idx) => {
              const slot = banner.id;
              const hasImage = banner && banner.image;
              return (
                <div key={slot} style={styles.bannerSlot}>
                  <div style={styles.bannerHeader}>
                    <span style={{ color: '#e8e8f0', fontSize: 13, fontWeight: 600 }}>Баннер {slot}</span>
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
              <div style={{ color: '#e8e8f0', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                Тариф {tarif}₽ {tarif === '9990' ? '(Амбассадор)' : ''}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
                      <label style={{ ...styles.priceLabel, color: '#3CC8A1' }}>3 мес ↺</label>
                      <input
                        type="number"
                        value={data.months?.[3] || ''}
                        onChange={e => updatePrice(tarif, '3', e.target.value)}
                        style={styles.priceInput2}
                      />
                    </div>
                    <div style={styles.priceField}>
                      <label style={{ ...styles.priceLabel, color: '#3CC8A1' }}>5 мес ↺</label>
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
              {tarif !== '9990' && (
                <div style={{ fontSize: 11, color: AP.muted, marginTop: 4 }}>
                  ↺ пересчитываются автоматически при смене цены за 1 мес (−14% и −17%)
                </div>
              )}
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

              <label style={styles.fieldLabel}>Подарочные роллы (шт.)</label>
              <input
                type="number"
                min="0"
                max="50"
                placeholder="0"
                value={addGiftRolls}
                onChange={e => setAddGiftRolls(e.target.value)}
                style={styles.input}
              />

              <label style={styles.fieldLabel}>Подарочные сеты (шт.)</label>
              <input
                type="number"
                min="0"
                max="50"
                placeholder="0"
                value={addGiftSets}
                onChange={e => setAddGiftSets(e.target.value)}
                style={styles.input}
              />

              <label style={styles.fieldLabel}>Подписка активна до *</label>
              <input
                type="date"
                value={addEndDate}
                onChange={e => setAddEndDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{ ...styles.input, marginBottom: 18, colorScheme: 'dark', maxWidth: '100%', WebkitAppearance: 'none', appearance: 'none' }}
                required
              />

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
                background: addResult.success ? 'rgba(60,200,161,0.1)' : 'rgba(255,77,106,0.1)',
                color: addResult.success ? '#3CC8A1' : '#ff4d6a',
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 700, marginBottom: addResult.success ? 8 : 0 }}>
                  {addResult.success ? '✓ ' : '✗ '}{addResult.message || addResult.error}
                </div>
                {addResult.success && addResult.user && (
                  <div style={{ fontSize: 12, color: '#9fb0c3', lineHeight: 1.7 }}>
                    <div><b>Имя:</b> {addResult.user.name}</div>
                    <div><b>Телефон:</b> {addResult.user.phone}</div>
                    <div><b>Тариф:</b> {addResult.user.tariff} ₽</div>
                    <div><b>Период:</b> {addResult.user.subscription_start} — {addResult.user.subscription_end}</div>
                    {addResult.gifts_granted > 0 && (
                      <div><b>Подарки:</b> {addResult.gifts_granted} шт. выдано</div>
                    )}
                    <div style={{ color: '#999', marginTop: 2 }}>ID: {addResult.user.telegram_id}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Stats Tab ─── */}
      {tab === 'stats' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={styles.addTitle}>Дашборд</h3>
            <button style={styles.btnSmall} onClick={loadStats} disabled={dashLoading}>
              {dashLoading ? '...' : 'Обновить'}
            </button>
          </div>
          {dashStats && (
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statVal}>{dashStats.totalUsers}</div>
                <div style={styles.statLabel}>Всего в базе</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statVal}>{dashStats.activeTotal}</div>
                <div style={styles.statLabel}>Активных</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statVal}>{dashStats.expiringSoon}</div>
                <div style={styles.statLabel}>Истекает ≤7 дн.</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statVal}>{dashStats.newThisWeek}</div>
                <div style={styles.statLabel}>Новых за 7 дн.</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statVal}>{dashStats.revenueThisMonth?.toLocaleString('ru-RU')} ₽</div>
                <div style={styles.statLabel}>Выручка за месяц</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statVal}>{dashStats.ambassadors}</div>
                <div style={styles.statLabel}>Амбассадоров</div>
              </div>
              <div style={{ ...styles.statCard, gridColumn: '1 / -1' }}>
                <div style={styles.statLabel}>По тарифам (активные)</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                  {Object.entries(dashStats.activeByTariff).map(([t, n]) => (
                    <span key={t} style={{ fontWeight: 700, fontSize: 15 }}>
                      {t}₽: <span style={{ color: '#3CC8A1' }}>{n}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          {!dashStats && !dashLoading && <p style={styles.muted}>Нажмите «Обновить»</p>}
        </div>
      )}

      {/* ─── Add Product Tab ─── */}
      {tab === 'add-product' && (
        <div>
          <div style={styles.addCard}>
            <h3 style={styles.addTitle}>Добавить позицию</h3>

            {/* Выбор категории — 5 кнопок */}
            <label style={styles.fieldLabel}>Категория</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {[
                { id: 'rolls',    label: 'Холодные роллы' },
                { id: 'zaproll', label: 'Запечённые' },
                { id: 'sets',    label: 'Сеты' },
                { id: 'gift-roll', label: '🎁 Подарочный ролл' },
                { id: 'gift-set',  label: '🎁 Подарочный сет' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  style={newCatId === cat.id ? styles.catBtnActive : styles.catBtn}
                  onClick={() => { setNewCatId(cat.id); setNewAddToSub(false); setNewSubSku(''); }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <form onSubmit={addProduct}>
              <label style={styles.fieldLabel}>Название *</label>
              <input
                type="text"
                placeholder="Название товара"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={styles.input}
                required
              />

              <label style={styles.fieldLabel}>
                {isGiftCat(newCatId) ? 'ID в Frontpad *' : 'Артикул Frontpad *'}
              </label>
              <input
                type="text"
                placeholder="Например: 1234"
                value={newSku}
                onChange={e => setNewSku(e.target.value)}
                style={styles.input}
                required
              />

              {/* Цена — только для обычных категорий */}
              {!isGiftCat(newCatId) && (
                <>
                  <label style={styles.fieldLabel}>Цена без скидки (₽) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Например: 750"
                    value={newPrice}
                    onChange={e => setNewPrice(e.target.value)}
                    style={styles.input}
                    required
                  />
                </>
              )}

              {isGiftCat(newCatId) && (
                <div style={{ padding: '8px 12px', background: 'rgba(60,200,161,0.07)', borderRadius: 8, marginBottom: 10, fontSize: 12, color: AP.muted }}>
                  Цена: <b style={{ color: AP.accent }}>0 ₽</b> (подарок)
                </div>
              )}

              <label style={styles.fieldLabel}>Описание (необязательно)</label>
              <input
                type="text"
                placeholder="Состав или краткое описание"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                style={styles.input}
              />

              <label style={styles.fieldLabel}>Фото товара</label>
              <label style={{ ...styles.grantBtn, display: 'inline-block', marginBottom: 10, cursor: 'pointer' }}>
                Выбрать фото
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => { if (e.target.files[0]) handleNewProductImage(e.target.files[0]); }}
                />
              </label>
              {newImagePreview && (
                <div style={{ marginBottom: 10 }}>
                  <img
                    src={newImagePreview}
                    alt="preview"
                    style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, boxShadow: NEU.card }}
                  />
                </div>
              )}

              {/* Скидочный каталог — только для обычных категорий */}
              {!isGiftCat(newCatId) && (
                <div style={{ padding: '10px 12px', background: 'rgba(60,200,161,0.06)', borderRadius: 10, marginBottom: 10, border: '1px solid rgba(60,200,161,0.15)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: newAddToSub ? 8 : 0 }}>
                    <input
                      type="checkbox"
                      checked={newAddToSub}
                      onChange={e => setNewAddToSub(e.target.checked)}
                    />
                    <span style={{ fontSize: 12, color: AP.text, fontWeight: 600 }}>Добавить в скидочный магазин</span>
                  </label>
                  {newAddToSub && (
                    <>
                      <label style={styles.fieldLabel}>Артикул для скидочного каталога *</label>
                      <input
                        type="text"
                        placeholder="4-значный артикул"
                        value={newSubSku}
                        onChange={e => setNewSubSku(e.target.value)}
                        style={{ ...styles.input, marginBottom: 0 }}
                      />
                    </>
                  )}
                </div>
              )}

              <button
                type="submit"
                style={styles.btnPrimary}
                disabled={
                  newProductLoading || !newName.trim() || !newSku.trim() ||
                  (!isGiftCat(newCatId) && !newPrice)
                }
              >
                {newProductLoading ? 'Добавление...' : 'Добавить позицию'}
              </button>
            </form>

            {newProductResult && (
              <div style={{
                marginTop: 14,
                padding: '12px 14px',
                borderRadius: 10,
                background: newProductResult.success ? 'rgba(60,200,161,0.1)' : 'rgba(255,77,106,0.1)',
                color: newProductResult.success ? AP.accent : AP.danger,
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 700 }}>
                  {newProductResult.success
                    ? `✓ Добавлено: ${newProductResult.name}`
                    : `✗ ${newProductResult.error}`}
                </div>
                {newProductResult.addedTo && (
                  <div style={{ fontSize: 11, color: AP.muted, marginTop: 4 }}>
                    Каталог: {newProductResult.addedTo.join(', ')}
                  </div>
                )}
                {newProductResult.imagePath && (
                  <div style={{ fontSize: 11, color: AP.muted, marginTop: 2 }}>
                    Фото: {newProductResult.imagePath}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Orders Tab ─── */}
      {tab === 'orders' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={styles.addTitle}>Заказы подписчиков</h3>
            <button style={styles.btnSmall} onClick={loadGiftOrders} disabled={giftOrdersLoading}>
              {giftOrdersLoading ? '...' : 'Обновить'}
            </button>
          </div>
          <input
            style={{ ...styles.input, marginBottom: 10, fontSize: 12 }}
            placeholder="Поиск по имени, телефону, адресу..."
            value={giftOrdersSearch}
            onChange={e => setGiftOrdersSearch(e.target.value)}
          />
          {giftOrdersLoading && <p style={styles.muted}>Загрузка...</p>}
          {giftOrders && (() => {
            const q = giftOrdersSearch.trim().toLowerCase();
            const filtered = q
              ? giftOrders.filter(o =>
                  (o.client_name || o.user_name || '').toLowerCase().includes(q) ||
                  (o.user_phone || '').includes(q) ||
                  (o.address || '').toLowerCase().includes(q)
                )
              : giftOrders;
            return filtered.length === 0
              ? <p style={styles.muted}>Нет заказов</p>
              : filtered.map(o => {
                let products = [];
                try { products = JSON.parse(o.products_json || '[]'); } catch {}
                const productNames = products.map(p => p.name).filter(Boolean).join(', ') || '—';
                const date = o.created_at ? new Date(o.created_at).toLocaleDateString('ru-RU') : '—';
                const isGift = o.order_type === 'gift';
                return (
                  <div key={o.id} style={{ ...styles.subCard, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: isGift ? CP.green : CP.cyan, fontWeight: 700, fontSize: 13 }}>
                        {productNames}
                      </span>
                      <span style={{ color: CP.muted, fontSize: 12 }}>{date}</span>
                    </div>
                    <div style={{ fontSize: 13, color: CP.text, marginBottom: 2 }}>
                      {o.client_name || o.user_name || '—'}
                      {o.user_tariff && <span style={{ color: CP.muted, marginLeft: 6, fontSize: 11 }}>{o.user_tariff}₽</span>}
                      <span style={{ color: isGift ? CP.green : CP.cyan, marginLeft: 6, fontSize: 11 }}>
                        {isGift ? '🎁 Подарок' : '🏷 Со скидкой'}
                      </span>
                      {o.total_price > 0 && <span style={{ color: CP.muted, marginLeft: 6, fontSize: 11 }}>{o.total_price}₽</span>}
                    </div>
                    {o.user_phone && <div style={{ fontSize: 12, color: CP.muted }}>{o.user_phone}</div>}
                    {o.address && <div style={{ fontSize: 12, color: CP.yellow, marginTop: 2 }}>
                      {o.delivery_type === 'delivery' ? '🚗 ' : '🏪 '}{o.address}
                    </div>}
                  </div>
                );
              });
          })()}
          {!giftOrders && !giftOrdersLoading && <p style={styles.muted}>Нажмите «Обновить»</p>}
        </div>
      )}
    </div>
  );
}

// ─── Palette ───────────────────────────────────────────────────
const AP = {
  bg:      '#1a1a1a',
  surface: '#202024',
  raise:   '#2c2c30',
  shadow:  '#111113',
  border:  'rgba(255,255,255,0.07)',
  accent:  '#3CC8A1',
  accentD: '#28a882',
  accentL: '#50dcb0',
  text:    '#e8e8f0',
  muted:   '#888899',
  danger:  '#ff4d6a',
  warn:    '#f5923a',
  yellow:  '#ffd600',
};

// JSX backward-compat (CP.cyan / CP.pink / CP.green / CP.muted / CP.text / CP.yellow)
const CP = {
  bg: AP.bg, surface: AP.surface, card: AP.surface, border: AP.border,
  text: AP.text, muted: AP.muted, yellow: AP.yellow,
  cyan: AP.accent, cyanDim: AP.accentD, green: AP.accent, pink: AP.danger,
};

// ─── Neumorphic shadow tokens ──────────────────────────────────
const NEU = {
  card:   '6px 6px 16px #111113, -4px -4px 12px #2c2c30',
  btnOut: '3px 3px 8px #111113, -2px -2px 6px #2e2e36',
  btnIn:  'inset 2px 2px 6px #111113, inset -1px -1px 4px #2e2e36',
  teal:   '0 4px 16px rgba(60,200,161,0.38), 0 2px 8px rgba(60,200,161,0.22)',
  tealSm: '0 2px 10px rgba(60,200,161,0.26)',
  danger: '0 3px 12px rgba(255,77,106,0.28)',
  warn:   '0 3px 12px rgba(245,146,58,0.28)',
};

const styles = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '12px 14px 60px',
    fontFamily: '"Montserrat", "Segoe UI", Arial, sans-serif',
    color: AP.text,
    background: AP.bg,
    minHeight: '100vh',
    boxSizing: 'border-box',
    overflowX: 'hidden',
  },
  loginCard: {
    maxWidth: 320,
    margin: '100px auto',
    padding: 28,
    background: AP.surface,
    borderRadius: 20,
    textAlign: 'center',
    boxShadow: NEU.card,
  },
  title: {
    color: AP.accent,
    margin: '0 0 14px',
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: AP.bg,
    border: `1px solid ${AP.border}`,
    borderRadius: 10,
    color: AP.text,
    fontSize: 14,
    boxSizing: 'border-box',
    marginBottom: 10,
    outline: 'none',
    boxShadow: NEU.btnIn,
  },
  btnPrimary: {
    width: '100%',
    padding: '12px 20px',
    background: AP.accent,
    color: '#051a12',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: NEU.teal,
    transition: 'all 0.2s',
  },
  btnSmall: {
    padding: '6px 14px',
    background: AP.surface,
    color: AP.muted,
    border: 'none',
    borderRadius: 8,
    fontSize: 11,
    cursor: 'pointer',
    boxShadow: NEU.btnOut,
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  error: { color: AP.danger, marginTop: 10, fontSize: 12 },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottom: `1px solid ${AP.border}`,
  },
  // ─── Group tabs ──────────────────────────────────────────────
  groupTab: {
    flex: 1,
    padding: '10px 8px',
    background: AP.surface,
    color: AP.muted,
    border: 'none',
    borderRadius: 14,
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    boxShadow: NEU.btnOut,
    transition: 'all 0.2s',
  },
  groupTabActive: {
    flex: 1,
    padding: '10px 8px',
    background: AP.accent,
    color: '#051a12',
    border: 'none',
    borderRadius: 14,
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    boxShadow: NEU.teal,
    transition: 'all 0.2s',
  },
  // ─── Sub-tabs ────────────────────────────────────────────────
  subTabs: {
    display: 'flex',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  subTab: {
    padding: '6px 12px',
    background: AP.surface,
    color: AP.muted,
    border: 'none',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: NEU.btnOut,
    transition: 'all 0.2s',
  },
  subTabActive: {
    padding: '6px 12px',
    background: 'rgba(60,200,161,0.1)',
    color: AP.accent,
    border: 'none',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `${NEU.btnIn}, 0 0 8px rgba(60,200,161,0.18)`,
    transition: 'all 0.2s',
  },
  // ─── Catalog sub-tabs ────────────────────────────────────────
  catalogTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  catBtn: {
    padding: '4px 9px',
    background: AP.surface,
    color: AP.muted,
    border: 'none',
    borderRadius: 6,
    fontSize: 10,
    cursor: 'pointer',
    boxShadow: NEU.btnOut,
    fontWeight: 600,
    transition: 'all 0.15s',
  },
  catBtnActive: {
    padding: '4px 9px',
    background: 'rgba(60,200,161,0.1)',
    color: AP.accent,
    border: 'none',
    borderRadius: 6,
    fontSize: 10,
    cursor: 'pointer',
    fontWeight: 700,
    boxShadow: `${NEU.btnIn}, ${NEU.tealSm}`,
    transition: 'all 0.15s',
  },
  muted: { color: AP.muted, fontSize: 12 },
  productList: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
  },
  productRow: {
    display: 'flex',
    flexDirection: 'column',
    padding: '10px',
    background: AP.surface,
    borderRadius: 10,
    gap: 6,
    boxShadow: NEU.card,
  },
  productInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minWidth: 0,
  },
  productName: { fontSize: 11, color: AP.text, wordBreak: 'break-word', fontWeight: 500 },
  sku: { fontSize: 10, color: AP.muted },
  productActions: { display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'space-between' },
  price: {
    fontSize: 12,
    fontWeight: 700,
    color: AP.accent,
    cursor: 'pointer',
  },
  editRow: { display: 'flex', gap: 4, alignItems: 'center' },
  priceInput: {
    width: 56,
    padding: '4px 5px',
    background: AP.bg,
    border: `1px solid ${AP.border}`,
    borderRadius: 6,
    color: AP.text,
    fontSize: 12,
    textAlign: 'right',
    boxShadow: NEU.btnIn,
    outline: 'none',
  },
  btnSave: {
    padding: '4px 9px',
    background: AP.accent,
    color: '#051a12',
    border: 'none',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: NEU.tealSm,
  },
  btnCancel: {
    padding: '4px 8px',
    background: AP.surface,
    color: AP.muted,
    border: 'none',
    borderRadius: 6,
    fontSize: 11,
    cursor: 'pointer',
    boxShadow: NEU.btnOut,
  },
  toggleOn: {
    padding: '3px 7px',
    background: 'rgba(60,200,161,0.12)',
    color: AP.accent,
    border: 'none',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    minWidth: 34,
    boxShadow: NEU.tealSm,
  },
  toggleOff: {
    padding: '3px 7px',
    background: 'rgba(255,77,106,0.1)',
    color: AP.danger,
    border: 'none',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    minWidth: 34,
    boxShadow: NEU.danger,
  },
  // Subscribers
  statsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  statBadge: {
    padding: '3px 10px',
    background: AP.surface,
    borderRadius: 6,
    fontSize: 11,
    color: AP.muted,
    boxShadow: NEU.btnOut,
    fontWeight: 600,
  },
  filterRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  select: {
    padding: '6px 10px',
    background: AP.surface,
    border: `1px solid ${AP.border}`,
    borderRadius: 8,
    color: AP.text,
    fontSize: 12,
    boxShadow: NEU.btnIn,
    outline: 'none',
  },
  searchInput: {
    flex: 1,
    minWidth: 130,
    padding: '6px 10px',
    background: AP.surface,
    border: `1px solid ${AP.border}`,
    borderRadius: 8,
    color: AP.text,
    fontSize: 12,
    outline: 'none',
    boxShadow: NEU.btnIn,
  },
  subsCount: { fontSize: 11, color: AP.muted, marginBottom: 6 },
  subsList: { display: 'flex', flexDirection: 'column', gap: 8 },
  subRow: {
    padding: '12px',
    background: AP.surface,
    borderRadius: 14,
    boxShadow: NEU.card,
  },
  subCard: {
    padding: '12px',
    background: AP.surface,
    borderRadius: 14,
    boxShadow: NEU.card,
  },
  subMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  subName: { fontSize: 13, color: AP.text, fontWeight: 700 },
  tariffBadge: (tariff) => ({
    padding: '2px 7px',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 700,
    background: tariff === '9990' ? 'rgba(255,214,0,0.15)' : tariff === '1190' ? 'rgba(60,200,161,0.14)' : tariff === '490' ? 'rgba(60,200,161,0.1)' : 'rgba(130,130,150,0.15)',
    color: tariff === '9990' ? AP.yellow : tariff === '1190' ? AP.accent : tariff === '490' ? AP.accentL : AP.muted,
    boxShadow: tariff === '9990' ? '0 1px 6px rgba(255,214,0,0.25)' : (tariff === '1190' || tariff === '490') ? NEU.tealSm : 'none',
  }),
  ambBadge: {
    padding: '2px 6px',
    borderRadius: 5,
    fontSize: 9,
    fontWeight: 700,
    background: 'rgba(255,214,0,0.15)',
    color: AP.yellow,
    boxShadow: '0 1px 6px rgba(255,214,0,0.2)',
  },
  subDetails: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 7,
    fontSize: 11,
    color: AP.muted,
    wordBreak: 'break-all',
  },
  refRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    fontSize: 11,
    color: AP.accent,
    marginTop: 4,
  },
  // Gifts
  giftsRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: `1px solid ${AP.border}`,
  },
  giftsSummary: {
    fontSize: 11,
    color: AP.accent,
    marginRight: 7,
  },
  giftsLast: {
    fontSize: 11,
    color: AP.muted,
  },
  giftsWindows: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  giftClaimed: {
    padding: '2px 6px',
    background: 'rgba(60,200,161,0.1)',
    borderRadius: 5,
    fontSize: 10,
    color: AP.accent,
    boxShadow: NEU.tealSm,
  },
  grantRow: {
    display: 'flex',
    gap: 5,
    marginBottom: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  grantInput: {
    flex: 1,
    padding: '7px 10px',
    background: AP.surface,
    border: `1px solid ${AP.border}`,
    borderRadius: 8,
    color: AP.text,
    fontSize: 12,
    outline: 'none',
    boxShadow: NEU.btnIn,
  },
  grantBtn: {
    padding: '6px 10px',
    background: 'rgba(60,200,161,0.1)',
    color: AP.accent,
    border: 'none',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: NEU.tealSm,
  },
  claimBtn: {
    padding: '6px 10px',
    background: 'rgba(255,77,106,0.1)',
    color: AP.danger,
    border: 'none',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: NEU.danger,
  },
  resetSubBtn: {
    padding: '6px 10px',
    background: 'rgba(255,77,106,0.1)',
    color: AP.danger,
    border: 'none',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: NEU.danger,
  },
  tariffRow: {
    display: 'flex',
    gap: 5,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  tariffBtnActive: {
    padding: '5px 10px',
    background: 'rgba(60,200,161,0.12)',
    color: AP.accent,
    border: 'none',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `${NEU.btnIn}, ${NEU.tealSm}`,
  },
  tariffBtnInactive: {
    padding: '5px 10px',
    background: AP.surface,
    color: AP.muted,
    border: 'none',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: NEU.btnOut,
  },
  daysInput: {
    width: 44,
    padding: '4px 6px',
    background: AP.bg,
    color: AP.text,
    border: `1px solid ${AP.border}`,
    borderRadius: 7,
    fontSize: 11,
    textAlign: 'center',
    boxShadow: NEU.btnIn,
    outline: 'none',
  },
  extendBtn: {
    padding: '5px 10px',
    background: 'rgba(245,146,58,0.12)',
    color: AP.warn,
    border: 'none',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: NEU.warn,
  },
  notesRow: {
    marginTop: 8,
  },
  notesInput: {
    width: '100%',
    padding: '6px 10px',
    background: AP.bg,
    color: AP.text,
    border: `1px solid ${AP.border}`,
    borderRadius: 8,
    fontSize: 11,
    boxSizing: 'border-box',
    boxShadow: NEU.btnIn,
    outline: 'none',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  statCard: {
    background: AP.surface,
    borderRadius: 14,
    padding: '14px 16px',
    boxShadow: NEU.card,
  },
  statVal: {
    fontSize: 26,
    fontWeight: 700,
    color: AP.accent,
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: 11,
    color: AP.muted,
    marginTop: 4,
    letterSpacing: '0.04em',
  },
  // Banners
  bannerSlot: {
    background: AP.surface,
    borderRadius: 14,
    padding: 12,
    boxShadow: NEU.card,
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
    background: AP.bg,
    color: AP.muted,
    fontSize: 12,
    border: `1px dashed ${AP.border}`,
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
    fontSize: 10,
    color: AP.muted,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  priceInput2: {
    padding: '8px 7px',
    background: AP.bg,
    border: `1px solid ${AP.border}`,
    borderRadius: 8,
    color: AP.accent,
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
    width: '100%',
    boxSizing: 'border-box',
    boxShadow: NEU.btnIn,
    outline: 'none',
  },
  // Add User
  addCard: {
    background: AP.surface,
    borderRadius: 16,
    padding: 16,
    boxShadow: NEU.card,
  },
  addTitle: {
    margin: '0 0 14px',
    fontSize: 13,
    fontWeight: 700,
    color: AP.accent,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  fieldLabel: {
    display: 'block',
    fontSize: 10,
    fontWeight: 700,
    color: AP.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  subEditRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: '8px 10px',
    background: 'rgba(60,200,161,0.06)',
    borderRadius: 10,
    flexWrap: 'wrap',
    boxShadow: 'inset 0 0 0 1px rgba(60,200,161,0.2)',
  },
  dateInput: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    padding: '5px 8px',
    background: AP.bg,
    border: `1px solid ${AP.border}`,
    borderRadius: 7,
    color: AP.text,
    fontSize: 12,
    colorScheme: 'dark',
    WebkitAppearance: 'none',
    appearance: 'none',
    boxSizing: 'border-box',
    boxShadow: NEU.btnIn,
    outline: 'none',
  },
  applyBtn: {
    padding: '5px 14px',
    background: AP.accent,
    color: '#051a12',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: NEU.tealSm,
  },
};

export default AdminPage;
