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

function normalizeBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function isActiveByDates({ subscriptionStart, subscriptionEnd }) {
  const today = todayUTC();
  const start = parseDDMMYYYY(subscriptionStart);
  const end = parseDDMMYYYY(subscriptionEnd);

  if (!start && !end) {
    return false;
  }
  if (start && today < start) {
    return false;
  }
  if (end && today > end) {
    return false;
  }
  return true;
}

function deriveSubscriptionState({
  tariff,
  subscriptionStatus,
  subscriptionStart,
  subscriptionEnd,
  paymentMethodId,
  autoRenewDisabled,
}) {
  // Защита от null/undefined
  if (!tariff && !subscriptionStatus && !subscriptionStart && !subscriptionEnd) {
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
  const isAutoRenewDisabled = normalizeBoolean(autoRenewDisabled);

  let resolvedSubscriptionStatus = 'неактивно';
  if (normalizedStatus === 'неактивно') {
    resolvedSubscriptionStatus = 'неактивно';
  } else if (hasSubscriptionWindow) {
    resolvedSubscriptionStatus = activeByDates ? 'активно' : 'неактивно';
  } else if (normalizedStatus === 'активно') {
    resolvedSubscriptionStatus = 'активно';
  }

  const hasPaymentMethod = Boolean(normalizePaymentMethodId(paymentMethodId)) && !isAutoRenewDisabled;

  return {
    subscriptionStatus: resolvedSubscriptionStatus,
    autoRenewStatus: hasPaymentMethod ? 'активно' : 'неактивно',
    hasPaymentMethod,
    activeByDates,
  };
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
    autoRenewDisabled: user.auto_renew_disabled,
  });
}

function deriveFromCache(cache) {
  // ФИКС: Добавляем защиту от null/undefined
  if (!cache) {
    return {
      subscriptionStatus: 'неактивно',
      autoRenewStatus: 'неактивно',
      hasPaymentMethod: false,
      activeByDates: false,
    };
  }

  const variables = cache?.variables || {};

  return deriveSubscriptionState({
    tariff: cache?.tarif || null,
    subscriptionStatus: variables['статусСписания'] || null,
    subscriptionStart: variables['датаНачала'] || null,
    subscriptionEnd: variables['датаОКОНЧАНИЯ'] || null,
    paymentMethodId: variables['PaymentID'] || null,
    autoRenewDisabled: variables['auto_renew_disabled'] || null,
  });
}

module.exports = {
  deriveSubscriptionState,
  deriveFromDbUser,
  deriveFromCache,
};
