export const WEB_TOKEN_KEY = 'web_token';
export const WEB_USER_ID_KEY = 'web_user_id';

export function saveWebAuth(data) {
  if (!data?.token || !data?.userId) return false;
  localStorage.setItem(WEB_TOKEN_KEY, data.token);
  localStorage.setItem(WEB_USER_ID_KEY, data.userId);
  return true;
}

export function clearWebAuth() {
  localStorage.removeItem(WEB_TOKEN_KEY);
  localStorage.removeItem(WEB_USER_ID_KEY);
}

// Заголовок Authorization для запросов к эндпоинтам, требующим JWT.
// Возвращает {} если пользователь не залогинен через веб (нет токена).
export function getAuthHeader() {
  const token = localStorage.getItem(WEB_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getSafeReturnUrl(defaultUrl = '/') {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('return_to');
  if (!value || !value.startsWith('/') || value.startsWith('//')) return defaultUrl;
  return value;
}
