// src/hooks/useWordle.js — логика игры «Пятибуквенное слово»

import { useState, useCallback } from 'react';

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

export function useWordle({ token, onWin }) {
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState([]); // массив массивов { letter, status }
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [toast, setToast] = useState(null); // { text, type }
  const [loading, setLoading] = useState(false);
  const [winsToday, setWinsToday] = useState(null);
  const [revealedWord, setRevealedWord] = useState(null);

  const showToast = useCallback((text, type = '') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleChar = useCallback((char) => {
    if (gameOver || loading) return;
    if (currentGuess.length < WORD_LENGTH) {
      setCurrentGuess(prev => prev + char.toLowerCase());
    }
  }, [currentGuess.length, gameOver, loading]);

  const handleDelete = useCallback(() => {
    if (gameOver || loading) return;
    setCurrentGuess(prev => prev.slice(0, -1));
  }, [gameOver, loading]);

  const handleSubmit = useCallback(async () => {
    if (gameOver || loading) return;
    if (currentGuess.length !== WORD_LENGTH) {
      showToast('Введите 5 букв');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/game-guess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ word: currentGuess, attempt: guesses.length + 1 }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Ошибка');
        setLoading(false);
        return;
      }

      const newGuesses = [...guesses, data.result];
      setGuesses(newGuesses);
      setCurrentGuess('');

      if (data.isWon) {
        setGameWon(true);
        setGameOver(true);
        setWinsToday(data.winsToday);
        const msg = data.shcEarned > 0
          ? `Победа! +${data.shcEarned} SHC 🎉`
          : 'Победа! 🎉 (лимит SHC на сегодня исчерпан)';
        showToast(msg, 'win');
        if (onWin) onWin(data.winsToday);
      } else if (newGuesses.length >= MAX_ATTEMPTS) {
        setGameOver(true);
        if (data.reveal) setRevealedWord(data.reveal);
        showToast(`Слово: ${data.reveal || '?'}`, 'lose');
      }
    } catch {
      showToast('Ошибка соединения');
    }
    setLoading(false);
  }, [currentGuess, guesses, gameOver, loading, token, onWin, showToast]);

  const resetGame = useCallback(() => {
    setCurrentGuess('');
    setGuesses([]);
    setGameOver(false);
    setGameWon(false);
    setToast(null);
    setRevealedWord(null);
  }, []);

  return {
    currentGuess,
    guesses,
    gameOver,
    gameWon,
    toast,
    loading,
    winsToday,
    revealedWord,
    handleChar,
    handleDelete,
    handleSubmit,
    resetGame,
    WORD_LENGTH,
    MAX_ATTEMPTS,
  };
}
