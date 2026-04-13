// src/UserContext.js — Контекст пользователя

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const UserContext = createContext(null);
const PENDING_PAYMENT_KEY = 'pending_payment_check';
const WEB_TOKEN_KEY = 'web_token';
const WEB_USER_ID_KEY = 'web_user_id';

// Декодирует JWT без верификации (верификация на сервере)
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    // JWT использует URL-safe base64 (- и _), atob() требует стандартный (+, /)
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function hasActivatedSubscription(resp) {
  const data = resp?.data;
  const status = data?.variables?.['статусСписания'] || data?.derived?.status || null;
  return status === 'активно' && Boolean(data?.tarif);
}

export function UserProvider({ children }) {
  // --- Источник 1: JWT из localStorage (веб-вход по телефону) ---
  const webAuth = useMemo(() => {
    const token = localStorage.getItem(WEB_TOKEN_KEY);
    if (!token) return null;
    const payload = decodeJwt(token);
    if (!payload) return null;
    // Проверяем срок действия токена
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem(WEB_TOKEN_KEY);
      localStorage.removeItem(WEB_USER_ID_KEY);
      return null;
    }
    return { id: payload.userId, name: payload.name || null };
  }, []);

  // --- Источник 2: Telegram WebApp ---
  const tgUser = useMemo(() => {
    const tg = window.Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user;
    return user ? {
      id: String(user.id),
      name: [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
    } : null;
  }, []);

  // --- Финальный telegramId: JWT > Telegram WebApp > URL param ---
  // web_ ID из URL не принимаем — веб-пользователь должен иметь JWT в localStorage.
  // Иначе любой, у кого есть ссылка с ?telegram_id=web_..., мог бы открыть чужой кабинет.
  const telegramId = useMemo(() => {
    if (webAuth?.id) return webAuth.id;
    if (tgUser?.id) return tgUser.id;
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('telegram_id');
    if (urlId && !urlId.startsWith('web_')) return urlId;
    return null;
  }, [webAuth, tgUser]);

  // true если пользователь вошёл через веб (не Telegram)
  const isWebUser = Boolean(webAuth?.id);

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  const sync = useCallback((force = false) => {
    if (!telegramId) {
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    return fetch('/api/sync-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: telegramId, force, tg_name: tgUser?.name || webAuth?.name || null }),
    })
      .then(r => r.json())
      .then(resp => {
        if (resp.success && resp.data) {
          setUserData(resp.data);
        }
        return resp;
      })
      .catch((err) => {
        console.error('[UserContext] Ошибка синхронизации:', err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [telegramId, tgUser?.name, webAuth?.name]);

  // Вход по телефону (веб-версия)
  const loginByPhone = useCallback(async (phone, name) => {
    const resp = await fetch('/api/auth/login-by-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, name }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) {
      throw new Error(data.error || 'Ошибка входа');
    }
    localStorage.setItem(WEB_TOKEN_KEY, data.token);
    localStorage.setItem(WEB_USER_ID_KEY, data.userId);
    // Перезагружаем страницу чтобы UserContext пересчитал telegramId из нового токена
    window.location.href = '/';
    return data;
  }, []);

  // Выход из веб-версии
  const logout = useCallback(() => {
    localStorage.removeItem(WEB_TOKEN_KEY);
    localStorage.removeItem(WEB_USER_ID_KEY);
    window.location.href = '/';
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPaymentReturn = params.get('payment') === 'success';
    const invitedBy = params.get('invited_by');

    sync(isPaymentReturn).then(() => {
      if (isPaymentReturn) {
        params.delete('payment');
        const clean = params.toString();
        const newUrl = window.location.pathname + (clean ? '?' + clean : '');
        window.history.replaceState({}, '', newUrl);
      }
    });

    // Регистрируем реферальную связь если пришли по реф-ссылке
    if (invitedBy && telegramId && String(invitedBy) !== String(telegramId)) {
      fetch('/api/register-referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: telegramId, invited_by: invitedBy }),
      })
        .then(r => r.json())
        .then(() => {
          // Убираем invited_by из URL чтобы не регистрировать повторно
          const cleanParams = new URLSearchParams(window.location.search);
          cleanParams.delete('invited_by');
          const clean = cleanParams.toString();
          window.history.replaceState({}, '', window.location.pathname + (clean ? '?' + clean : ''));
        })
        .catch(() => {});
    }
  }, [sync, telegramId]);

  useEffect(() => {
    if (!sessionStorage.getItem(PENDING_PAYMENT_KEY)) return undefined;

    let stopped = false;
    const timers = [];

    const runSync = (delay) => {
      const timer = setTimeout(() => {
        if (stopped) return;
        sync(true).then((resp) => {
          if (hasActivatedSubscription(resp)) {
            sessionStorage.removeItem(PENDING_PAYMENT_KEY);
            stopped = true;
          }
        });
      }, delay);
      timers.push(timer);
    };

    const handleReturnToApp = () => {
      if (stopped || document.visibilityState === 'hidden') return;
      runSync(0);
      runSync(2500);
      runSync(7000);
      runSync(15000);
    };

    window.addEventListener('focus', handleReturnToApp);
    document.addEventListener('visibilitychange', handleReturnToApp);
    handleReturnToApp();

    return () => {
      stopped = true;
      timers.forEach(clearTimeout);
      window.removeEventListener('focus', handleReturnToApp);
      document.removeEventListener('visibilitychange', handleReturnToApp);
    };
  }, [sync]);

  const tarif = userData?.tarif || null;

  const hasTag = useCallback((tagName) => {
    return (userData?.tags || []).includes(tagName);
  }, [userData]);

  const contactId = userData?.contact?.id || null;
  const contactName = userData?.contact?.name || null;

  const phone = userData?.listItem?.telefon
    || userData?.variables?.phone
    || userData?.variables?.['телефон']
    || null;

  const listItemName = userData?.listItem?.name || null;

  const profile = useMemo(() => {
    if (!userData) return null;
    const v = userData.variables || {};
    return {
      name: contactName,
      first_name: v['first_name'] || null,
      last_name: v['last_name'] || null,
      middle_name: v['middle_name'] || null,
      phone,
      статусСписания: v['статусСписания'] || null,
      balance_shc: v['balance_shc'] || null,
      датаОКОНЧАНИЯ: v['датаОКОНЧАНИЯ'] || null,
      датаНачала: v['датаНачала'] || null,
      датаПодарка: v['датаПодарка'] || null,
      ref_url: v['ref_url'] || null,
      partner_code: v['partner_code'] || null,
      invited_by: v['invited_by'] || null,
      payment_method_id: v['PaymentID'] || null,
      has_payment_id: !!v['PaymentID'],
      contact_id: contactId,
    };
  }, [userData, contactName, phone, contactId]);

  const value = useMemo(() => ({
    telegramId,
    loading,
    userData,
    sync,
    tarif,
    hasTag,
    contactId,
    contactName,
    phone,
    listItemName,
    profile,
    isWebUser,
    loginByPhone,
    logout,
  }), [telegramId, loading, userData, sync, tarif, hasTag, contactId, contactName, phone, listItemName, profile, isWebUser, loginByPhone, logout]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
