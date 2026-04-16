// src/hooks/useWordle.js — логика игры «Пятибуквенное слово»

import { useState, useCallback, useEffect, useRef } from 'react';

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const STORAGE_VERSION = 1;

function getStorageKey(sessionId) {
  return `wordle_progress_${sessionId}`;
}

function saveProgress(sessionId, { guesses, gameOver, gameWon, revealedWord }) {
  if (!sessionId || guesses.length === 0) return;
  try {
    localStorage.setItem(getStorageKey(sessionId), JSON.stringify(
      { v: STORAGE_VERSION, guesses, gameOver, gameWon, revealedWord }
    ));
  } catch {}
}

function loadProgress(sessionId) {
  if (!sessionId) return null;
  try {
    const raw = localStorage.getItem(getStorageKey(sessionId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.v !== STORAGE_VERSION) {
      localStorage.removeItem(getStorageKey(sessionId));
      return null;
    }
    return data;
  } catch {
    try { localStorage.removeItem(getStorageKey(sessionId)); } catch {}
    return null;
  }
}

function cleanStaleProgress(currentSessionId) {
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('wordle_progress_') && k !== getStorageKey(currentSessionId)) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
}

export function useWordle({ token, sessionId, onWin, onGameOver }) {
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState([]); // массив массивов { letter, status }
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [toast, setToast] = useState(null); // { text, type }
  const [loading, setLoading] = useState(false);
  const [winsToday, setWinsToday] = useState(null);
  const [revealedWord, setRevealedWord] = useState(null);
  const hasRestoredRef = useRef(false);

  // Восстановление прогресса при появлении sessionId
  useEffect(() => {
    if (!sessionId || hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    cleanStaleProgress(sessionId);
    const saved = loadProgress(sessionId);
    if (!saved || saved.guesses.length === 0) return;
    setGuesses(saved.guesses);
    setGameOver(saved.gameOver);
    setGameWon(saved.gameWon);
    setRevealedWord(saved.revealedWord ?? null);
  }, [sessionId]);

  // Сохранение после каждой засчитанной попытки
  useEffect(() => {
    if (!sessionId || guesses.length === 0) return;
    saveProgress(sessionId, { guesses, gameOver, gameWon, revealedWord });
  }, [guesses, gameOver, gameWon, revealedWord, sessionId]);

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
    if (sessionId) try { localStorage.removeItem(getStorageKey(sessionId)); } catch {}
    hasRestoredRef.current = false;
    setCurrentGuess('');
    setGuesses([]);
    setGameOver(false);
    setGameWon(false);
    setToast(null);
    setRevealedWord(null);
  }, [sessionId]);

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
