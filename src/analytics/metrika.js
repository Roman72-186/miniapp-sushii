const YM_COUNTER_ID = Number(process.env.REACT_APP_YM_COUNTER_ID);
const SITE_URL = process.env.REACT_APP_SITE_URL || 'https://sushi-house-39.ru';
const APP_ENV = process.env.REACT_APP_APP_ENV || process.env.NODE_ENV;
const IS_METRIKA_ENABLED =
  APP_ENV === 'production' || process.env.REACT_APP_ENABLE_METRIKA === 'true';

export const YM_GOALS = {
  AUTH_PHONE_START: 'auth_phone_start',
  AUTH_PHONE_SUCCESS: 'auth_phone_success',
  EMAIL_OTP_SUCCESS: 'email_otp_success',
  PASSWORD_SET_SUCCESS: 'password_set_success',
  CART_ADD: 'cart_add',
  CART_OPEN: 'cart_open',
  CHECKOUT_START: 'checkout_start',
  DELIVERY_ADDRESS_ENTERED: 'delivery_address_entered',
  PROMO_APPLY_SUCCESS: 'promo_apply_success',
  PAYMENT_REDIRECT: 'payment_redirect',
  ORDER_CREATED: 'order_created',
  PAYMENT_SUCCESS: 'payment_success',
  SUBSCRIPTION_PURCHASE_SUCCESS: 'subscription_purchase_success',
  PROFILE_UPDATE_SUCCESS: 'profile_update_success',
  PARTNER_CODE_APPLY_SUCCESS: 'partner_code_apply_success',
  UI_CLICK: 'ui_click',
  NAVIGATION_CLICK: 'navigation_click',
};

function canUseMetrika() {
  return (
    IS_METRIKA_ENABLED &&
    typeof window !== 'undefined' &&
    YM_COUNTER_ID &&
    !Number.isNaN(YM_COUNTER_ID)
  );
}

export function initMetrika() {
  if (!canUseMetrika()) return;
  if (window.__YANDEX_METRIKA_INITIALIZED__) return;

  window.__YANDEX_METRIKA_INITIALIZED__ = true;
  window.dataLayer = window.dataLayer || [];

  (function (m, e, t, r, i, k, a) {
    m[i] =
      m[i] ||
      function () {
        (m[i].a = m[i].a || []).push(arguments);
      };
    m[i].l = 1 * new Date();
    k = e.createElement(t);
    a = e.getElementsByTagName(t)[0];
    k.async = 1;
    k.src = r;
    a.parentNode.insertBefore(k, a);
  })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');

  window.ym(YM_COUNTER_ID, 'init', {
    defer: true,
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
    ecommerce: 'dataLayer',
  });
}

export function ymHit(path, title = document.title, referer) {
  if (!canUseMetrika() || typeof window.ym !== 'function') return;

  const url = path.startsWith('http')
    ? path
    : `${window.location.origin}${path}`;

  window.ym(YM_COUNTER_ID, 'hit', url, {
    title,
    referer,
  });
}

export function reachGoal(goalId, params = {}) {
  if (!canUseMetrika() || typeof window.ym !== 'function') return;
  window.ym(YM_COUNTER_ID, 'reachGoal', goalId, params);
}

export function reachGoalOnce(storageKey, goalId, params = {}, storage = 'session') {
  if (!canUseMetrika() || typeof window === 'undefined') return;

  const store = storage === 'local' ? window.localStorage : window.sessionStorage;
  const key = `ym_goal_${storageKey}`;
  if (store.getItem(key)) return;

  reachGoal(goalId, params);
  store.setItem(key, '1');
}

export function pushEcommerce(data) {
  if (!canUseMetrika() || typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(data);
}

export function getMetrikaCounterId() {
  return YM_COUNTER_ID;
}

export function getSiteUrl() {
  return SITE_URL;
}
