// Singleton OTP store — in-memory, per-phone, TTL 5 min
const store = new Map();

const TTL_MS = 5 * 60 * 1000;   // 5 минут
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 60 * 1000;  // 1 минута между повторными запросами

function set(phone) {
  const code = String(Math.floor(1000 + Math.random() * 9000));
  store.set(phone, { code, expiresAt: Date.now() + TTL_MS, attempts: 0, sentAt: Date.now() });
  return code;
}

function canResend(phone) {
  const entry = store.get(phone);
  if (!entry) return true;
  return Date.now() - entry.sentAt >= COOLDOWN_MS;
}

function timeUntilResend(phone) {
  const entry = store.get(phone);
  if (!entry) return 0;
  return Math.max(0, Math.ceil((entry.sentAt + COOLDOWN_MS - Date.now()) / 1000));
}

function verify(phone, inputCode) {
  const entry = store.get(phone);
  if (!entry) return { ok: false, reason: 'expired' };
  if (Date.now() > entry.expiresAt) {
    store.delete(phone);
    return { ok: false, reason: 'expired' };
  }
  entry.attempts++;
  if (entry.attempts > MAX_ATTEMPTS) {
    store.delete(phone);
    return { ok: false, reason: 'too_many' };
  }
  if (String(inputCode).trim() !== entry.code) {
    return { ok: false, reason: 'wrong', attemptsLeft: MAX_ATTEMPTS - entry.attempts };
  }
  store.delete(phone);
  return { ok: true };
}

module.exports = { set, canResend, timeUntilResend, verify };
