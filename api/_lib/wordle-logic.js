// api/_lib/wordle-logic.js — чистая логика Wordle (без зависимостей)

const CELL_STATUS = {
  CORRECT: 'correct',
  PRESENT: 'present',
  ABSENT: 'absent',
  EMPTY: 'empty',
  UNCHECKED: 'unchecked',
};

function calculateGuessResult(guess, target) {
  const g = guess.toLowerCase();
  const t = target.toLowerCase();
  const targetLetters = t.split('');
  const result = Array(5).fill(null).map((_, i) => ({ letter: guess[i], status: CELL_STATUS.EMPTY }));

  // Первый проход — точные совпадения
  for (let i = 0; i < 5; i++) {
    if (g[i] === t[i]) {
      result[i].status = CELL_STATUS.CORRECT;
      targetLetters[i] = '';
    }
  }

  // Второй проход — буква есть, но не на месте
  for (let i = 0; i < 5; i++) {
    if (result[i].status === CELL_STATUS.CORRECT) continue;
    const idx = targetLetters.indexOf(g[i]);
    if (idx !== -1) {
      result[i].status = CELL_STATUS.PRESENT;
      targetLetters[idx] = '';
    } else {
      result[i].status = CELL_STATUS.ABSENT;
    }
  }

  return result;
}

// «Игровой день» — сбрасывается в 20:10 UTC (22:10 Калининград UTC+2)
function getGameDay() {
  const now = new Date();
  const resetHour = 20, resetMinute = 10;
  if (
    now.getUTCHours() < resetHour ||
    (now.getUTCHours() === resetHour && now.getUTCMinutes() < resetMinute)
  ) {
    // До сброса — считаем вчерашним днём
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return yesterday.toISOString().slice(0, 10);
  }
  return now.toISOString().slice(0, 10);
}

module.exports = { calculateGuessResult, CELL_STATUS, getGameDay };
