// src/components/FloatingGameWidget.js — плавающий виджет игры (перетаскиваемый)

import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import '../wordle.css';

const STORAGE_KEY = 'wordle_widget_pos';
const DEFAULT_POS = { right: 16, bottom: 80 };
const DRAG_THRESHOLD = 6; // px — минимальное смещение для распознавания drag

function loadPos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function savePos(pos) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
}

function FloatingGameWidget() {
  const [stats, setStats] = useState(null);
  const token = localStorage.getItem('web_token');

  // Позиция виджета: { x, y } в px от левого-верхнего угла
  const [pos, setPos] = useState(() => {
    const saved = loadPos();
    if (saved?.x != null) return saved;
    // Преобразуем bottom/right в x/y при первом запуске
    const w = 68, h = 76;
    return {
      x: window.innerWidth - DEFAULT_POS.right - w,
      y: window.innerHeight - DEFAULT_POS.bottom - h,
    };
  });

  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const startPtr = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const widgetRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/game-stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.isSubscriber) setStats(data); })
      .catch(() => {});
  }, [token]);

  const clampPos = useCallback((x, y) => {
    const w = widgetRef.current?.offsetWidth || 68;
    const h = widgetRef.current?.offsetHeight || 76;
    return {
      x: Math.max(0, Math.min(window.innerWidth - w, x)),
      y: Math.max(0, Math.min(window.innerHeight - h, y)),
    };
  }, []);

  const onPointerDown = useCallback((e) => {
    isDragging.current = true;
    hasMoved.current = false;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startPtr.current = { x: clientX, y: clientY };
    startPos.current = { ...pos };
    e.preventDefault();
  }, [pos]);

  const onPointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - startPtr.current.x;
    const dy = clientY - startPtr.current.y;

    if (!hasMoved.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    hasMoved.current = true;

    const newPos = clampPos(startPos.current.x + dx, startPos.current.y + dy);
    setPos(newPos);
  }, [clampPos]);

  const onPointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (hasMoved.current) {
      savePos(pos);
    } else {
      window.location.href = '/game';
    }
  }, [pos]);

  useEffect(() => {
    const opts = { passive: false };
    window.addEventListener('touchmove', onPointerMove, opts);
    window.addEventListener('touchend', onPointerUp);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    return () => {
      window.removeEventListener('touchmove', onPointerMove, opts);
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  if (!stats) return null;

  const remaining = stats.remainingWins ?? 0;

  return ReactDOM.createPortal(
    <div
      ref={widgetRef}
      className="wrd-widget wrd-widget--draggable"
      style={{ left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }}
      onTouchStart={onPointerDown}
      onMouseDown={onPointerDown}
    >
      <div className="wrd-widget__btn">
        🎮
        <span className={`wrd-widget__badge${remaining === 0 ? ' wrd-widget__badge--zero' : ''}`}>
          {remaining}
        </span>
      </div>
      <span className="wrd-widget__label">5 букв</span>
    </div>,
    document.body
  );
}

export default FloatingGameWidget;
