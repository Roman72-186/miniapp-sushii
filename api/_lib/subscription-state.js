const { parseDDMMYYYY, todayUTC } = require('./gift-windows');

function normalizeStatus(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'активно') return 'активно';
  if (trimmed === 'неактивно') return 'неактивно';
  return null;
}

function normalizePaymentMethodId(value) {
  if (value == null) return '';
  return String(value).trim();
}

function isActiveByDates({ subscriptionStart, subscriptionEnd }) {
  const today = todayUTC();
  const start = parseDDMMYYYY(subscriptionStart);
  const end = parseDDMMYYYY(subscriptionEnd);

  // 🔍 DEBUG: Логируем проверку дат
  console.log('[subscription-state] isActiveByDates:', {
    subscriptionStart,
    subscriptionEnd,
    today: today.toISOString(),
    startParsed: start ? start.toISOString() : null,
    endParsed: end ? end.toISOString() : null,
  });

  if (!start && !end) {
    console.log('[subscription-state] Нет дат начала и окончания → false');
    return false;
  }
  if (start && today < start) {
    console.log('[subscription-state] Сегодня раньше даты начала → false');
    return false;
  }
  if (end && today > end) {
    console.log('[subscription-state] Сегодня позже даты окончания → false');
    return false;
  }
  console.log('[subscription-state] Подписка активна по датам → true');
  return true;
}

function deriveSubscriptionState({
  tariff,
  subscriptionStatus,
  subscriptionStart,
  subscriptionEnd,
  paymentMethodId,
}) {
  // Защита от null/undefined
  if (!tariff && !subscriptionStatus && !subscriptionStart && !subscriptionEnd) {
    console.warn('[subscription-state] Все поля подписки пустые');
    return {
      subscriptionStatus: 'неактивно',
      autoRenewStatus: 'неактивно',
      hasPaymentMethod: false,
      activeByDates: false,
    };
  }

  const normalizedStatus = normalizeStatus(subscriptionStatus);
  const hasSubscriptionWindow = Boolean(tariff || subscriptionStart || subscriptionEnd);
  const activeByDates = isActiveByDates({ subscriptionStart, subscriptionEnd });

  // 🔍 DEBUG: Логируем входные данные
  console.log('[subscription-state] deriveSubscriptionState вызван:', {
    tariff,
    subscriptionStatus,
    subscriptionStart,
    subscriptionEnd,
    paymentMethodId,
    normalizedStatus,
    hasSubscriptionWindow,
    activeByDates,
  });

  let resolvedSubscriptionStatus = 'неактивно';
  if (normalizedStatus === 'неактивно') {
    resolvedSubscriptionStatus = 'неактивно';
    console.log('[subscription-state] Статус неактивно по normalizedStatus');
  } else if (hasSubscriptionWindow) {
    resolvedSubscriptionStatus = activeByDates ? 'активно' : 'неактивно';
    console.log('[subscription-state] Статус определён по датам:', resolvedSubscriptionStatus);
  } else if (normalizedStatus === 'активно') {
    resolvedSubscriptionStatus = 'активно';
    console.log('[subscription-state] Статус активно по normalizedStatus');
  }

  const hasPaymentMethod = Boolean(normalizePaymentMethodId(paymentMethodId));

  const result = {
    subscriptionStatus: resolvedSubscriptionStatus,
    autoRenewStatus: hasPaymentMethod ? 'активно' : 'неактивно',
    hasPaymentMethod,
    activeByDates,
  };
  
  // 🔍 DEBUG: Логируем результат
  console.log('[subscription-state] Результат:', result);

  return result;
}

function deriveFromDbUser(user) {
  if (!user) {
    return {
      subscriptionStatus: 'неактивно',
      autoRenewStatus: 'неактивно',
      hasPaymentMethod: false,
      activeByDates: false,
    };
  }

  return deriveSubscriptionState({
    tariff: user.tariff,
    subscriptionStatus: user.subscription_status,
    subscriptionStart: user.subscription_start,
    subscriptionEnd: user.subscription_end,
    paymentMethodId: user.payment_method_id,
  });
}

function deriveFromCache(cache) {
  // 🔍 DEBUG: Логируем входной кэш
  console.log('[subscription-state] deriveFromCache вход:', {
    cache: cache ? 'exists' : 'null/undefined',
    tarif: cache?.tarif,
    variables: cache?.variables ? 'exists' : 'null/undefined',
  });

  // ФИКС: Добавляем защиту от null/undefined
  if (!cache) {
    console.warn('[subscription-state] Кэш пуст, возвращаем неактивно');
    return {
      subscriptionStatus: 'неактивно',
      autoRenewStatus: 'неактивно',
      hasPaymentMethod: false,
      activeByDates: false,
    };
  }

  const variables = cache?.variables || {};

  // 🔍 DEBUG: Логируем переменные
  console.log('[subscription-state] deriveFromCache переменные:', {
    'статусСписания': variables['статусСписания'],
    'датаНачала': variables['датаНачала'],
    'датаОКОНЧАНИЯ': variables['датаОКОНЧАНИЯ'],
    'PaymentID': variables['PaymentID'],
  });

  return deriveSubscriptionState({
    tariff: cache?.tarif || null,
    subscriptionStatus: variables['статусСписания'] || null,
    subscriptionStart: variables['датаНачала'] || null,
    subscriptionEnd: variables['датаОКОНЧАНИЯ'] || null,
    paymentMethodId: variables['PaymentID'] || null,
  });
}

module.exports = {
  deriveSubscriptionState,
  deriveFromDbUser,
  deriveFromCache,
};
