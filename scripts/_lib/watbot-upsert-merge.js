function hasValue(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

function preferIncoming(incomingValue, existingValue) {
  if (hasValue(incomingValue)) return incomingValue;
  if (hasValue(existingValue)) return existingValue;
  return null;
}

function hasLocalAccessState(existingUser) {
  if (!existingUser) return false;

  return (
    hasValue(existingUser.tariff)
    || Boolean(existingUser.is_ambassador)
    || hasValue(existingUser.subscription_status)
    || hasValue(existingUser.subscription_start)
    || hasValue(existingUser.subscription_end)
    || hasValue(existingUser.payment_method_id)
  );
}

function buildWatbotUpsertPayload({ telegramId, contact, existingUser, watbotState }) {
  const keepLocalAccess = hasLocalAccessState(existingUser);

  return {
    keepLocalAccess,
    payload: {
      telegram_id: String(telegramId),
      name: preferIncoming(contact.name, existingUser?.name),
      phone: preferIncoming(watbotState.phone, existingUser?.phone),
      tariff: keepLocalAccess
        ? (existingUser?.tariff || null)
        : preferIncoming(watbotState.tariff, existingUser?.tariff),
      is_ambassador: keepLocalAccess
        ? Boolean(existingUser?.is_ambassador)
        : (Boolean(watbotState.isAmbassador) || Boolean(existingUser?.is_ambassador)),
      subscription_status: keepLocalAccess
        ? (existingUser?.subscription_status || null)
        : preferIncoming(watbotState.subscription_status, existingUser?.subscription_status),
      subscription_start: keepLocalAccess
        ? (existingUser?.subscription_start || null)
        : preferIncoming(watbotState.subscription_start, existingUser?.subscription_start),
      subscription_end: keepLocalAccess
        ? (existingUser?.subscription_end || null)
        : preferIncoming(watbotState.subscription_end, existingUser?.subscription_end),
      payment_method_id: keepLocalAccess
        ? (existingUser?.payment_method_id || null)
        : preferIncoming(watbotState.payment_method_id, existingUser?.payment_method_id),
      balance_shc: hasValue(watbotState.balance_shc) ? Number(watbotState.balance_shc) : undefined,
      ref_url: preferIncoming(watbotState.ref_url, existingUser?.ref_url),
      watbot_contact_id: preferIncoming(contact.id ? String(contact.id) : null, existingUser?.watbot_contact_id),
    },
  };
}

module.exports = {
  buildWatbotUpsertPayload,
};
