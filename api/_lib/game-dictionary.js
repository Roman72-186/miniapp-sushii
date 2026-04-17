function loadFiveLetterWords() {
  const words = require('../game-words.json');
  return words.map(w => String(w).toLowerCase()).filter(w => /^[а-яё]{5}$/.test(w));
}

module.exports = { loadFiveLetterWords };
