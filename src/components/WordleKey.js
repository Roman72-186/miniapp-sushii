// src/components/WordleKey.js

import React from 'react';

function WordleKey({ char, onClick, status, disabled, wide }) {
  const statusClass = status && status !== 'unchecked' ? `wrd-key--${status}` : '';
  return (
    <button
      className={`wrd-key${wide ? ' wrd-key--wide' : ''} ${statusClass}`}
      onClick={onClick}
      disabled={disabled}
    >
      {char}
    </button>
  );
}

export default WordleKey;
