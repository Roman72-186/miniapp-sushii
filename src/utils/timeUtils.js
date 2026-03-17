// src/utils/timeUtils.js — Утилиты времени (Калининград, UTC+2)

const CLOSE_HOUR = 21;
const CLOSE_MIN = 50;
const OPEN_HOUR = 10;

/** Текущее время в Калининграде (UTC+2) */
function getNowKaliningrad() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Kaliningrad' }));
}

/** Проверка: открыт ли приём заказов (10:00–21:50 Калининград) */
function isShopOpen() {
  const now = getNowKaliningrad();
  const h = now.getHours();
  const m = now.getMinutes();
  if (h < OPEN_HOUR) return false;
  if (h > CLOSE_HOUR) return false;
  if (h === CLOSE_HOUR && m >= CLOSE_MIN) return false;
  return true;
}

/**
 * Генерирует список доступных временных слотов (шаг 15 мин)
 * Минимум: текущее время + 1 час (округлено вверх до 15 мин)
 */
function getTimeSlots() {
  const now = getNowKaliningrad();
  const minTime = new Date(now.getTime() + 60 * 60 * 1000);

  const mins = minTime.getMinutes();
  const roundedMins = Math.ceil(mins / 15) * 15;
  minTime.setMinutes(roundedMins, 0, 0);
  if (roundedMins >= 60) {
    minTime.setHours(minTime.getHours() + 1);
    minTime.setMinutes(0);
  }

  let startHour = minTime.getHours();
  let startMin = minTime.getMinutes();

  if (startHour > CLOSE_HOUR || (startHour === CLOSE_HOUR && startMin > CLOSE_MIN)) return [];

  if (startHour < OPEN_HOUR) {
    startHour = OPEN_HOUR;
    startMin = 0;
  }

  const slots = [];
  for (let h = startHour; h <= CLOSE_HOUR; h++) {
    const maxMin = (h === CLOSE_HOUR) ? CLOSE_MIN : 45;
    for (let m = (h === startHour ? startMin : 0); m <= maxMin; m += 15) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      slots.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` });
    }
  }

  return slots;
}

export { getNowKaliningrad, isShopOpen, getTimeSlots, OPEN_HOUR, CLOSE_HOUR, CLOSE_MIN };
