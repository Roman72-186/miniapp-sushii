// src/components/WordleGrid.js

import React, { useState, useEffect, useRef } from 'react';

function WordleGrid({ guesses, currentGuess, maxAttempts = 6, wordLength = 5 }) {
  const [animatingRowIdx, setAnimatingRowIdx] = useState(null);
  const prevLenRef = useRef(0);

  useEffect(() => {
    if (guesses.length > prevLenRef.current) {
      const idx = guesses.length - 1;
      setAnimatingRowIdx(idx);
      setTimeout(() => setAnimatingRowIdx(null), 900);
    }
    prevLenRef.current = guesses.length;
  }, [guesses.length]);

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
      {rows.map((row, ri) => {
        const isRevealing = ri === animatingRowIdx;
        return (
          <div key={ri} className="wrd-row">
            {row.cells.map((cell, ci) => (
              <div
                key={ci}
                className={`wrd-cell wrd-cell--${cell.status}${isRevealing ? ' wrd-cell--revealing' : ''}`}
                style={isRevealing ? { animationDelay: `${ci * 100}ms` } : undefined}
              >
                {cell.letter}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default WordleGrid;
