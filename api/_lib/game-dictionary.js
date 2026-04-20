function loadFiveLetterWords() {
  const customWords = require('../game-words.json');
  const filter = w => /^[а-яё]{5}$/.test(String(w).toLowerCase());
  return [...new Set(customWords.filter(filter).map(w => String(w).toLowerCase()))];
}

module.exports = { loadFiveLetterWords };
