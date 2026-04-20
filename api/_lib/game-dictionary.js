function loadFiveLetterWords() {
  const w1 = require('russian-words');
  const w2 = require('wordlist-russian').russian.slice(1); // первый элемент — счётчик
  const filter = w => /^[а-яё]{5}$/.test(String(w).toLowerCase());
  const combined = new Set([
    ...w1.filter(filter).map(w => String(w).toLowerCase()),
    ...w2.filter(filter).map(w => String(w).toLowerCase()),
  ]);
  return [...combined];
}

module.exports = { loadFiveLetterWords };
