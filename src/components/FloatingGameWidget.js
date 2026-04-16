// src/components/FloatingGameWidget.js — плавающий виджет игры

import React, { useEffect, useState } from 'react';
import '../wordle.css';

function FloatingGameWidget() {
  const [stats, setStats] = useState(null);
  const token = localStorage.getItem('web_token');

  useEffect(() => {
    if (!token) return;
    fetch('/api/game-stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.isSubscriber) setStats(data); })
      .catch(() => {});
  }, [token]);

  if (!stats) return null;

  const remaining = stats.remainingWins ?? 0;

  return (
    <div className="wrd-widget" onClick={() => { window.location.href = '/game'; }}>
      <div className="wrd-widget__btn">
        🎮
        <span className={`wrd-widget__badge${remaining === 0 ? ' wrd-widget__badge--zero' : ''}`}>
          {remaining}
        </span>
      </div>
      <span className="wrd-widget__label">5 букв</span>
    </div>
  );
}

export default FloatingGameWidget;
