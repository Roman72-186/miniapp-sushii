// src/WordlePage.js — Страница игры «Пятибуквенное слово» /game

import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from './UserContext';
import { useWordle } from './hooks/useWordle';
import WordleGrid from './components/WordleGrid';
import WordleKey from './components/WordleKey';
import './wordle.css';

const KEYBOARD_ROWS = [
  ['й','ц','у','к','е','н','г','ш','щ','з','х'],
  ['ф','ы','в','а','п','р','о','л','д','ж','э'],
  ['я','ч','с','м','и','т','ь','б','ю'],
  ['Enter','⌫'],
];

function WordlePage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  useUser(); // нужен контекст для будущих расширений
  const token = localStorage.getItem('web_token');

  const [gameStats, setGameStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(() => {
    if (!token) { setStatsLoading(false); return; }
    fetch('/api/game-stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setGameStats(data); setStatsLoading(false); })
      .catch(() => setStatsLoading(false));
  }, [token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleWin = useCallback((newWinsToday) => {
    setGameStats(prev => prev ? { ...prev, winsToday: newWinsToday, remainingWins: Math.max(0, 3 - newWinsToday) } : prev);
  }, []);

  const {
    currentGuess, guesses, gameOver, toast,
    loading, handleChar, handleDelete, handleSubmit, resetGame,
    MAX_ATTEMPTS, WORD_LENGTH,
  } = useWordle({ token, gameDay: gameStats?.gameDay, onWin: handleWin });

  // Статус клавиш
  function getKeyStatus(key) {
    let best = 'unchecked';
    for (const row of guesses) {
      for (const cell of row) {
        if (cell.letter.toLowerCase() === key) {
          if (cell.status === 'correct') return 'correct';
          if (cell.status === 'present') best = 'present';
          else if (best === 'unchecked') best = cell.status;
        }
      }
    }
    return best;
  }

  function handleKeyPress(key) {
    if (gameOver) return;
    if (key === 'Enter') handleSubmit();
    else if (key === '⌫' || key === 'Backspace') handleDelete();
    else if (/^[а-яё]$/.test(key)) handleChar(key);
  }

  // Клавиатура с физической клавиатуры
  useEffect(() => {
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      if (key === 'Enter') { e.preventDefault(); handleKeyPress('Enter'); }
      else if (key === 'Backspace') { e.preventDefault(); handleKeyPress('⌫'); }
      else if (/^[а-яёА-ЯЁ]$/.test(key)) handleKeyPress(key.toLowerCase());
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // без deps — всегда свежий handleKeyPress

  const isSubscriber = gameStats?.isSubscriber;
  const winsToday = gameStats?.winsToday ?? 0;
  const remainingWins = gameStats?.remainingWins ?? 3;

  if (statsLoading) {
    return (
      <div className="wrd-page">
        <header className="wrd-header">
          <button className="wrd-header__back" onClick={() => window.history.back()}>←</button>
          <span className="wrd-header__title">5 букв</span>
        </header>
        <div className="wrd-loading">Загрузка...</div>
      </div>
    );
  }

  if (!isSubscriber) {
    return (
      <div className="wrd-page">
        <header className="wrd-header">
          <button className="wrd-header__back" onClick={() => window.history.back()}>←</button>
          <span className="wrd-header__title">5 букв</span>
        </header>
        <div className="wrd-locked">
          <div className="wrd-locked__icon">🔒</div>
          <div className="wrd-locked__title">Только для подписчиков</div>
          <div className="wrd-locked__desc">
            Угадай слово дня за 6 попыток.<br/>
            Получай по 3 SHC за каждую победу — до 3 раз в день.
          </div>
          <button className="wrd-locked__btn" onClick={() => window.location.href = '/'}>
            Оформить подписку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrd-page">
      <header className="wrd-header">
        <button className="wrd-header__back" onClick={() => window.history.back()}>←</button>
        <span className="wrd-header__title">5 букв</span>
        <span className="wrd-header__wins">
          {remainingWins > 0 ? `+3 SHC × ${remainingWins}` : '✓ SHC получены'}
        </span>
      </header>

      {toast && (
        <div className={`wrd-toast${toast.type === 'win' ? ' wrd-toast--win' : toast.type === 'lose' ? ' wrd-toast--lose' : ''}`}>
          {toast.text}
        </div>
      )}

      <div className="wrd-body">
        <div className="wrd-subtitle">
          Угадай слово дня · {winsToday}/3 побед сегодня
        </div>

        <WordleGrid
          guesses={guesses}
          currentGuess={currentGuess}
          maxAttempts={MAX_ATTEMPTS}
          wordLength={WORD_LENGTH}
        />

        {gameOver && (
          <div className="wrd-actions">
            <button className="wrd-btn wrd-btn--primary" onClick={() => { resetGame(); fetchStats(); }}>
              Играть снова
            </button>
          </div>
        )}

        <div className="wrd-keyboard">
          {KEYBOARD_ROWS.map((row, ri) => (
            <div key={ri} className={`wrd-keyboard__row${ri === 3 ? ' wrd-keyboard__row--actions' : ''}`}>
              {row.map((key) => (
                <WordleKey
                  key={key}
                  char={key}
                  wide={key === 'Enter' || key === '⌫'}
                  onClick={() => handleKeyPress(key)}
                  status={getKeyStatus(key.toLowerCase())}
                  disabled={gameOver || loading}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WordlePage;
