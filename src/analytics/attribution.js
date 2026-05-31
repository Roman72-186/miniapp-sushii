const ATTRIBUTION_KEY = 'sushi_house_attribution';
const ATTRIBUTION_TTL_DAYS = 90;

const ALLOWED_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'yclid',
];

function cleanValue(value) {
  return String(value || '').trim().slice(0, 300);
}

function isFresh(savedAt) {
  const time = Date.parse(savedAt || '');
  if (!time) return false;
  return Date.now() - time <= ATTRIBUTION_TTL_DAYS * 24 * 60 * 60 * 1000;
}

export function saveAttributionFromUrl() {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const attribution = {};

  ALLOWED_KEYS.forEach(key => {
    const value = cleanValue(params.get(key));
    if (value) attribution[key] = value;
  });

  if (Object.keys(attribution).length === 0) return getAttribution();

  const payload = {
    ...attribution,
    landing_path: `${window.location.pathname}${window.location.search}`,
    saved_at: new Date().toISOString(),
  };

  window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(payload));
  return payload;
}

export function getAttribution() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !isFresh(parsed.saved_at)) {
      window.localStorage.removeItem(ATTRIBUTION_KEY);
      return null;
    }

    const attribution = {};
    ALLOWED_KEYS.forEach(key => {
      const value = cleanValue(parsed[key]);
      if (value) attribution[key] = value;
    });

    if (parsed.landing_path) attribution.landing_path = cleanValue(parsed.landing_path);
    if (parsed.saved_at) attribution.saved_at = cleanValue(parsed.saved_at);

    return Object.keys(attribution).length > 0 ? attribution : null;
  } catch {
    window.localStorage.removeItem(ATTRIBUTION_KEY);
    return null;
  }
}

export function getAttributionForRequest() {
  const attribution = getAttribution();
  if (!attribution) return undefined;
  return attribution;
}
