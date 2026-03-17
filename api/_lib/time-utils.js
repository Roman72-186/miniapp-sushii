// api/_lib/time-utils.js — Серверные утилиты времени (Калининград, UTC+2)

const CLOSE_HOUR = 21;
const CLOSE_MIN = 50;
const OPEN_HOUR = 10;

/** Текущее время в Калининграде (UTC+2) */
function getNowKaliningrad() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Kaliningrad' }));
}

/** Проверка: открыт ли приём заказов (10:00–21:50 Калининград) */
function isShopOpenServer() {
  const now = getNowKaliningrad();
  const h = now.getHours();
  const m = now.getMinutes();
  if (h < OPEN_HOUR) return false;
  if (h > CLOSE_HOUR) return false;
  if (h === CLOSE_HOUR && m >= CLOSE_MIN) return false;
  return true;
}

module.exports = { getNowKaliningrad, isShopOpenServer, OPEN_HOUR, CLOSE_HOUR, CLOSE_MIN };
