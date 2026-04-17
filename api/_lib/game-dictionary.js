function loadFiveLetterWords() {
  let words;
  try {
    words = require('russian-words');
  } catch {
    console.warn('[game-dict] russian-words not found, using fallback');
    words = require('../game-words.json');
  }
  return words.filter(w => /^[а-яё]{5}$/.test(String(w).toLowerCase()));
}

module.exports = { loadFiveLetterWords };
