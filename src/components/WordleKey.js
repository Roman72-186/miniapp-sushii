// src/components/WordleKey.js

import React, { useRef, useState, useCallback, useEffect } from 'react';

const LONG_PRESS_MS = 400;

function WordleKey({ char, onClick, status, disabled, wide, altChars }) {
  const hasAlt = Array.isArray(altChars) && altChars.length > 0;
  const options = hasAlt ? [char, ...altChars] : null;

  const [popupOpen, setPopupOpen] = useState(false);
  const timerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  const rootRef = useRef(null);

  const statusClass = status && status !== 'unchecked' ? `wrd-key--${status}` : '';

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Закрытие popup при клике вне кнопки
  useEffect(() => {
    if (!popupOpen) return;
    const onDocPointer = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) {
        setPopupOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDocPointer);
    return () => document.removeEventListener('pointerdown', onDocPointer);
  }, [popupOpen]);

  // --- Без альтернатив: обычная кнопка ---
  if (!hasAlt) {
    return (
      <button
        type="button"
        className={`wrd-key${wide ? ' wrd-key--wide' : ''} ${statusClass}`}
        onClick={() => onClick(char)}
        disabled={disabled}
      >
        {char}
      </button>
    );
  }

  // --- С альтернативами: long-press → popup → tap выбор ---
  const handlePointerDown = (e) => {
    if (disabled) return;
    if (popupOpen) return; // popup уже открыт, pointerdown на кнопке — игнор (выбор идёт кликом)
    e.preventDefault(); // блокируем scroll/selection на мобильных
    longPressFiredRef.current = false;
    clearTimer();
    timerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setPopupOpen(true);
      timerRef.current = null;
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = () => {
    clearTimer();
    if (popupOpen) return; // popup открыт — закрывать/выбирать будет клик по пункту
    if (!longPressFiredRef.current) {
      onClick(char); // короткий тап
    }
  };

  const handlePointerCancel = () => {
    clearTimer();
    // popup сам закроется при тапе вне
  };

  const handleItemPointerDown = (e) => {
    // не даём document-listener'у считать это внешним кликом
    e.stopPropagation();
  };

  const handleItemClick = (opt) => (e) => {
    e.stopPropagation();
    setPopupOpen(false);
    longPressFiredRef.current = false;
    onClick(opt);
  };

  return (
    <div
      ref={rootRef}
      className={`wrd-key wrd-key--has-alt${wide ? ' wrd-key--wide' : ''} ${statusClass}${popupOpen ? ' wrd-key--active-popup' : ''}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="wrd-key__label">{char}</span>
      {popupOpen && options && (
        <div
          className="wrd-key-popup"
          onPointerDown={handleItemPointerDown}
        >
          {options.map((opt) => (
            <button
              type="button"
              key={opt}
              className="wrd-key-popup__item"
              onClick={handleItemClick(opt)}
              onPointerDown={handleItemPointerDown}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default WordleKey;
