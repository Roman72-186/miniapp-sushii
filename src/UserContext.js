// src/UserContext.js — Контекст пользователя (кэш из Vercel Blob)

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const tgUser = useMemo(() => {
    const tg = window.Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user;
    return user ? {
      id: String(user.id),
      name: [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
    } : null;
  }, []);

  const telegramId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('telegram_id');
    return tgUser?.id || urlId || null;
  }, [tgUser]);

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  const sync = useCallback((force = false) => {
    if (!telegramId) {
      console.log('[UserContext] telegramId отсутствует, пропускаем синхронизацию');
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);

    // 🔍 DEBUG: Логируем запрос синхронизации
    console.log('[UserContext] Начинаем синхронизацию:', { telegramId, force, tgUser });

    return fetch('/api/sync-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: telegramId, force, tg_name: tgUser?.name || null }),
    })
      .then(r => {
        // 🔍 DEBUG: Логируем статус ответа
        console.log('[UserContext] Статус ответа:', r.status);
        return r.json();
      })
      .then(resp => {
        // 🔍 DEBUG: Логируем ответ сервера
        console.log('[UserContext] Ответ sync-user:', {
          success: resp.success,
          fromCache: resp.fromCache,
          source: resp.source,
          stale: resp.stale,
          hasData: !!resp.data,
          tarif: resp.data?.tarif,
          tags: resp.data?.tags,
        });

        if (resp.success && resp.data) {
          setUserData(resp.data);

          // 🔍 DEBUG: Логируем установленные данные
          console.log('[UserContext] Данные пользователя обновлены:', {
            telegram_id: resp.data.telegram_id,
            tarif: resp.data.tarif,
            tags: resp.data.tags,
            variables: resp.data.variables,
            fromCache: resp.fromCache,
          });
        } else {
          console.warn('[UserContext] Не удалось получить данные пользователя:', resp);
        }
      })
      .catch((err) => {
        console.error('[UserContext] Ошибка синхронизации:', {
          message: err.message,
          stack: err.stack,
        });
      })
      .finally(() => {
        console.log('[UserContext] Синхронизация завершена, loading=false');
        setLoading(false);
      });
  }, [telegramId, tgUser?.name]);

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
    if (!userData) {
      console.log('[UserContext] userData отсутствует, profile = null');
      return null;
    }
    const v = userData.variables || {};

    // 🔍 DEBUG: Логируем данные для формирования профиля
    console.log('[UserContext] Формирование профиля:', {
      hasUserData: !!userData,
      hasVariables: !!userData.variables,
      'variables.статусСписания': v['статусСписания'],
      'variables.датаНачала': v['датаНачала'],
      'variables.датаОКОНЧАНИЯ': v['датаОКОНЧАНИЯ'],
    });

    const profileData = {
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

    // 🔍 DEBUG: Логируем сформированный профиль
    console.log('[UserContext] Профиль сформирован:', {
      name: profileData.name,
      'статусСписания': profileData.статусСписания,
      'датаОКОНЧАНИЯ': profileData.датаОКОНЧАНИЯ,
      has_payment_id: profileData.has_payment_id,
    });

    return profileData;
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
