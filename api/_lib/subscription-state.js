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

  if (!start && !end) return false;
  if (start && today < start) return false;
  if (end && today > end) return false;
  return true;
}

function deriveSubscriptionState({
  tariff,
  subscriptionStatus,
  subscriptionStart,
  subscriptionEnd,
  paymentMethodId,
}) {
  const normalizedStatus = normalizeStatus(subscriptionStatus);
  const hasSubscriptionWindow = Boolean(tariff || subscriptionStart || subscriptionEnd);
  const activeByDates = isActiveByDates({ subscriptionStart, subscriptionEnd });

  let resolvedSubscriptionStatus = 'неактивно';
  if (normalizedStatus === 'неактивно') {
    resolvedSubscriptionStatus = 'неактивно';
  } else if (hasSubscriptionWindow) {
    resolvedSubscriptionStatus = activeByDates ? 'активно' : 'неактивно';
  } else if (normalizedStatus === 'активно') {
    resolvedSubscriptionStatus = 'активно';
  }

  const hasPaymentMethod = Boolean(normalizePaymentMethodId(paymentMethodId));

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
  });
}

function deriveFromCache(cache) {
  const variables = cache?.variables || {};
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
