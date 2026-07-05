export function getExplicitGiftSource(item) {
  return String(item?.giftSource || item?.product?.giftSource || '').trim();
}

export function isSubscriptionGiftItem(item) {
  if (!item?.product?.gift) return false;

  const explicitSource = getExplicitGiftSource(item);
  if (explicitSource) return explicitSource === 'subscription';

  const category = String(item?.product?.category || '').trim();
  return category === 'gift-rolls' || category === 'gift-sets';
}

export function getOrderGiftSource(item) {
  const explicitSource = getExplicitGiftSource(item);
  if (explicitSource) return explicitSource;
  return isSubscriptionGiftItem(item) ? 'subscription' : undefined;
}
