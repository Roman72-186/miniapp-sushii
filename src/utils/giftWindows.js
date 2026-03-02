// src/utils/giftWindows.js — Вычисление статуса окон для подарков (490→15дн, 1190→30дн)

/**
 * Парсит дату формата DD.MM.YYYY в объект Date (полночь, локальное время)
 */
function parseDDMMYYYY(str) {
  if (!str) return null;
  const parts = str.split('.');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd);
}

/**
 * Разница в днях между двумя датами (без учёта времени)
 */
function diffDays(a, b) {
  const msPerDay = 86400000;
  const aDate = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bDate = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((aDate - bDate) / msPerDay);
}

/**
 * Добавляет N дней к дате
 */
function addDays(date, n) {
  const result = new Date(date);
  result.setDate(result.getDate() + n);
  return result;
}

/**
 * Вычисляет статус подарочного окна.
 *
 * @param {string} датаНачала - DD.MM.YYYY дата начала подписки
 * @param {string} датаОКОНЧАНИЯ - DD.MM.YYYY дата окончания подписки
 * @param {string} датаПодарка - DD.MM.YYYY дата последнего получения подарка (или пусто)
 * @param {number} windowDays - размер окна в днях (490→15, 1190→30)
 * @returns {{ status: 'available'|'claimed'|'waiting'|'expired', daysLeft: number, windowNum: number, totalWindows: number }}
 */
export function getGiftStatus(датаНачала, датаОКОНЧАНИЯ, датаПодарка, windowDays = 15) {
  const startDate = parseDDMMYYYY(датаНачала);
  const endDate = parseDDMMYYYY(датаОКОНЧАНИЯ);

  if (!startDate || !endDate) {
    return { status: 'expired', daysLeft: 0, windowNum: 0, totalWindows: 0 };
  }

  const today = new Date();
  const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Общее число дней подписки и окон
  const totalDays = diffDays(endDate, startDate);
  const totalWindows = Math.max(1, Math.floor(totalDays / windowDays));

  // Подписка ещё не началась
  if (todayClean < startDate) {
    const daysLeft = diffDays(startDate, todayClean);
    return { status: 'waiting', daysLeft, windowNum: 0, totalWindows };
  }

  // Подписка закончилась
  if (todayClean >= endDate) {
    return { status: 'expired', daysLeft: 0, windowNum: totalWindows, totalWindows };
  }

  // Текущее окно
  const daysSinceStart = diffDays(todayClean, startDate);
  const windowIndex = Math.floor(daysSinceStart / windowDays);
  const windowStart = addDays(startDate, windowIndex * windowDays);
  const windowEnd = addDays(startDate, (windowIndex + 1) * windowDays);

  // Проверяем, забрал ли подарок в текущем окне
  const giftDate = parseDDMMYYYY(датаПодарка);
  if (giftDate && giftDate >= windowStart) {
    // Забрал — до следующего окна
    const daysLeft = diffDays(windowEnd, todayClean);
    return { status: 'claimed', daysLeft, windowNum: windowIndex + 1, totalWindows };
  }

  // Окно открыто, подарок не забран
  return { status: 'available', daysLeft: 0, windowNum: windowIndex + 1, totalWindows };
}
