// src/hooks/useWordle.js — логика игры «Пятибуквенное слово»

import { useState, useCallback, useEffect, useRef } from 'react';

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const STORAGE_VERSION = 1;

function getStorageKey(day) {
  return `wordle_progress_${day}`;
}

function saveProgress(day, { guesses, gameOver, gameWon, revealedWord }) {
  if (!day || guesses.length === 0) return;
  try {
    localStorage.setItem(getStorageKey(day), JSON.stringify(
      { v: STORAGE_VERSION, guesses, gameOver, gameWon, revealedWord }
    ));
  } catch {}
}

function loadProgress(day) {
  if (!day) return null;
  try {
    const raw = localStorage.getItem(getStorageKey(day));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.v !== STORAGE_VERSION) {
      localStorage.removeItem(getStorageKey(day));
      return null;
    }
    return data;
  } catch {
    try { localStorage.removeItem(getStorageKey(day)); } catch {}
    return null;
  }
}

function cleanStaleProgress(currentDay) {
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('wordle_progress_') && k !== getStorageKey(currentDay)) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
}

export function useWordle({ token, gameDay, onWin, onGameOver }) {
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState([]); // массив массивов { letter, status }
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [toast, setToast] = useState(null); // { text, type }
  const [loading, setLoading] = useState(false);
  const [winsToday, setWinsToday] = useState(null);
  const [revealedWord, setRevealedWord] = useState(null);
  const hasRestoredRef = useRef(false);

  // Восстановление прогресса при появлении gameDay
  useEffect(() => {
    if (!gameDay || hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    cleanStaleProgress(gameDay);
    const saved = loadProgress(gameDay);
    if (!saved || saved.guesses.length === 0) return;
    setGuesses(saved.guesses);
    setGameOver(saved.gameOver);
    setGameWon(saved.gameWon);
    setRevealedWord(saved.revealedWord ?? null);
  }, [gameDay]);

  // Сохранение после каждой засчитанной попытки
  useEffect(() => {
    if (!gameDay || guesses.length === 0) return;
    saveProgress(gameDay, { guesses, gameOver, gameWon, revealedWord });
  }, [guesses, gameOver, gameWon, revealedWord, gameDay]);

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
        if (onGameOver) onGameOver(data.winsToday);
      } else if (newGuesses.length >= MAX_ATTEMPTS) {
        setGameOver(true);
        if (data.reveal) setRevealedWord(data.reveal);
        showToast('Не угадали 😔', 'lose');
        if (onGameOver) onGameOver(null);
      }
    } catch {
      showToast('Ошибка соединения');
    }
    setLoading(false);
  }, [currentGuess, guesses, gameOver, loading, token, onWin, onGameOver, showToast]);

  const resetGame = useCallback(() => {
    if (gameDay) try { localStorage.removeItem(getStorageKey(gameDay)); } catch {}
    hasRestoredRef.current = false;
    setCurrentGuess('');
    setGuesses([]);
    setGameOver(false);
    setGameWon(false);
    setToast(null);
    setRevealedWord(null);
  }, [gameDay]);

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
