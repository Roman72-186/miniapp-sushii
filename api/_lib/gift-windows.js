// api/lib/gift-windows.js — Серверные утилиты для подарочных окон (CommonJS)

/**
 * Парсит дату DD.MM.YYYY → Date (полночь UTC)
 */
function parseDDMMYYYY(str) {
  // 🔍 DEBUG: Логируем входную строку
  console.log('[gift-windows] parseDDMMYYYY вызван с:', str);

  if (!str) {
    console.log('[gift-windows] Пустая строка → null');
    return null;
  }

  // Проверка формата DD.MM.YYYY
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(str)) {
    console.warn('[gift-windows] Неверный формат даты:', str);
    return null;
  }

  const parts = str.split('.');
  const [dd, mm, yyyy] = parts.map(Number);

  // Валидация значений
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12 || yyyy < 2020 || yyyy > 2030) {
    console.warn('[gift-windows] Невалидные значения:', { dd, mm, yyyy });
    return null;
  }

  // Проверка количества дней в месяце
  const daysInMonth = new Date(Date.UTC(yyyy, mm, 0)).getUTCDate();
  if (dd > daysInMonth) {
    console.warn('[gift-windows] Невалидный день месяца:', { dd, mm, yyyy, daysInMonth });
    return null;
  }

  const result = new Date(Date.UTC(yyyy, mm - 1, dd));
  console.log('[gift-windows] Дата успешно распарсена:', result.toISOString());
  return result;
}

/**
 * Форматирует Date → DD.MM.YYYY
 */
function formatDDMMYYYY(date) {
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * Добавляет N дней к дате (UTC)
 */
function addDays(date, n) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + n);
  return result;
}

/**
 * Сегодня в UTC (полночь)
 */
function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Генерирует массив окон между startDate и endDate
 * @param {string} startDateStr - DD.MM.YYYY
 * @param {string} endDateStr - DD.MM.YYYY
 * @param {number} windowDays - размер окна (15 или 30)
 * @returns {Array<{num, start, end, status, claimedAt}>}
 */
function buildWindows(startDateStr, endDateStr, windowDays) {
  const start = parseDDMMYYYY(startDateStr);
  const end = parseDDMMYYYY(endDateStr);
  if (!start || !end) return [];

  const windows = [];
  let current = new Date(start);
  let num = 1;

  while (current < end) {
    const windowEnd = addDays(current, windowDays);
    // Окно не выходит за дату окончания
    const actualEnd = windowEnd > end ? end : windowEnd;
    windows.push({
      num,
      start: formatDDMMYYYY(current),
      end: formatDDMMYYYY(actualEnd),
      status: 'available',
      claimedAt: null,
    });
    current = actualEnd;
    num++;
  }

  return windows;
}

/**
 * Находит текущее окно по сегодняшней дате
 * @param {Array} windows
 * @returns {object|null} текущее окно или null
 */
function getCurrentWindow(windows) {
  const today = todayUTC();
  for (const w of windows) {
    const wStart = parseDDMMYYYY(w.start);
    const wEnd = parseDDMMYYYY(w.end);
    if (wStart && wEnd && today >= wStart && today < wEnd) {
      return w;
    }
  }
  return null;
}

/**
 * Вычисляет статус подарка на основе массива окон
 * @param {Array} windows
 * @returns {{ currentStatus, daysLeft, currentWindow, totalWindows }}
 */
function computeStatus(windows) {
  if (!windows || windows.length === 0) {
    return { currentStatus: 'expired', daysLeft: 0, currentWindow: 0, totalWindows: 0 };
  }

  const today = todayUTC();
  const totalWindows = windows.length;
  const current = getCurrentWindow(windows);

  if (!current) {
    // Проверяем: все окна в прошлом или первое ещё не началось?
    const firstStart = parseDDMMYYYY(windows[0].start);
    if (firstStart && today < firstStart) {
      const daysLeft = Math.ceil((firstStart - today) / 86400000);
      return { currentStatus: 'waiting', daysLeft, currentWindow: 0, totalWindows };
    }
    return { currentStatus: 'expired', daysLeft: 0, currentWindow: totalWindows, totalWindows };
  }

  if (current.status === 'claimed') {
    const wEnd = parseDDMMYYYY(current.end);
    const daysLeft = wEnd ? Math.ceil((wEnd - today) / 86400000) : 0;
    return { currentStatus: 'claimed', daysLeft, currentWindow: current.num, totalWindows };
  }

  return { currentStatus: 'available', daysLeft: 0, currentWindow: current.num, totalWindows };
}

module.exports = {
  parseDDMMYYYY,
  formatDDMMYYYY,
  addDays,
  todayUTC,
  buildWindows,
  getCurrentWindow,
  computeStatus,
};
