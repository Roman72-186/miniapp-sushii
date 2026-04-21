// src/components/WordleKey.js

import React, { useRef, useState, useCallback } from 'react';

const LONG_PRESS_MS = 450;

function WordleKey({ char, onClick, status, disabled, wide, altChars }) {
  const hasAlt = Array.isArray(altChars) && altChars.length > 0;
  const options = hasAlt ? [char, ...altChars] : null;

  const [popupOpen, setPopupOpen] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(0);

  const timerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  const btnRef = useRef(null);
  const popupRef = useRef(null);

  const statusClass = status && status !== 'unchecked' ? `wrd-key--${status}` : '';

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const closePopup = useCallback(() => {
    setPopupOpen(false);
    setHoverIndex(0);
  }, []);

  // --- Без альтернатив: обычная кнопка с onClick ---
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

  // --- С альтернативами: long-press с popup ---
  const handlePointerDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    try { btnRef.current?.setPointerCapture(e.pointerId); } catch {}
    longPressFiredRef.current = false;
    clearTimer();
    timerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setPopupOpen(true);
      timerRef.current = null;
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e) => {
    if (!popupOpen || !popupRef.current) return;
    const items = popupRef.current.querySelectorAll('[data-alt-idx]');
    let idx = -1;
    items.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 6 && e.clientY <= r.bottom + 20) {
        idx = Number(el.getAttribute('data-alt-idx'));
      }
    });
    if (idx >= 0) setHoverIndex(idx);
  };

  const handlePointerUp = (e) => {
    clearTimer();
    try { btnRef.current?.releasePointerCapture(e.pointerId); } catch {}

    if (popupOpen) {
      // Проверим, палец отпущен на элементе popup? Если да — выбираем его; иначе — отменяем.
      let chosenIdx = -1;
      if (popupRef.current) {
        const items = popupRef.current.querySelectorAll('[data-alt-idx]');
        items.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 6 && e.clientY <= r.bottom + 20) {
            chosenIdx = Number(el.getAttribute('data-alt-idx'));
          }
        });
      }
      closePopup();
      if (chosenIdx >= 0) onClick(options[chosenIdx]);
      return;
    }

    // Короткое нажатие без popup — обычный ввод буквы
    if (!longPressFiredRef.current) {
      onClick(char);
    }
    longPressFiredRef.current = false;
  };

  const handlePointerCancel = () => {
    clearTimer();
    closePopup();
    longPressFiredRef.current = false;
  };

  return (
    <button
      ref={btnRef}
      type="button"
      className={`wrd-key wrd-key--has-alt${wide ? ' wrd-key--wide' : ''} ${statusClass}${popupOpen ? ' wrd-key--active-popup' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
    >
      <span className="wrd-key__label">{char}</span>
      {popupOpen && options && (
        <div className="wrd-key-popup" ref={popupRef}>
          {options.map((opt, i) => (
            <div
              key={opt}
              data-alt-idx={i}
              className={`wrd-key-popup__item${i === hoverIndex ? ' wrd-key-popup__item--active' : ''}`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

export default WordleKey;
