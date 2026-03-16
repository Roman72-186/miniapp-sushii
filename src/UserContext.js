// src/UserContext.js — Контекст пользователя (кэш из Vercel Blob)

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const telegramId = useMemo(() => {
    const tg = window.Telegram?.WebApp;
    const tgId = tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null;
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('telegram_id');
    return tgId || urlId || null;
  }, []);

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
      body: JSON.stringify({ telegram_id: telegramId, force }),
    })
      .then(r => r.json())
      .then(resp => {
        if (resp.success && resp.data) {
          setUserData(resp.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [telegramId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPaymentReturn = params.get('payment') === 'success';
    sync(isPaymentReturn).then(() => {
      // Очищаем payment=success из URL чтобы не было повторных sync при рефреше
      if (isPaymentReturn) {
        params.delete('payment');
        const clean = params.toString();
        const newUrl = window.location.pathname + (clean ? '?' + clean : '');
        window.history.replaceState({}, '', newUrl);
      }
    });
  }, [sync]);

  // Вычисляемые геттеры
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
      phone,
      статусСписания: v['статусСписания'] || null,
      balance_shc: v['balance_shc'] || null,
      датаОКОНЧАНИЯ: v['датаОКОНЧАНИЯ'] || null,
      датаНачала: v['датаНачала'] || null,
      датаПодарка: v['датаПодарка'] || null,
      ref_url: v['ref_url'] || null,
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
  }), [telegramId, loading, userData, sync, tarif, hasTag, contactId, contactName, phone, listItemName, profile]);

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
