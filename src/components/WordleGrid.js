// src/components/WordleGrid.js

import React from 'react';

function WordleGrid({ guesses, currentGuess, maxAttempts = 6, wordLength = 5 }) {
  const rows = [];
  for (let i = 0; i < maxAttempts; i++) {
    if (i < guesses.length) {
      rows.push({ cells: guesses[i], type: 'submitted' });
    } else if (i === guesses.length) {
      const cells = [];
      for (let j = 0; j < wordLength; j++) {
        cells.push({ letter: currentGuess[j] || '', status: currentGuess[j] ? 'unchecked' : 'empty' });
      }
      rows.push({ cells, type: 'current' });
    } else {
      const cells = Array(wordLength).fill(null).map(() => ({ letter: '', status: 'empty' }));
      rows.push({ cells, type: 'empty' });
    }
  }

  return (
    <div className="wrd-grid">
      {rows.map((row, ri) => (
        <div key={ri} className="wrd-row">
          {row.cells.map((cell, ci) => (
            <div key={ci} className={`wrd-cell wrd-cell--${cell.status}`}>
              {cell.letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default WordleGrid;
