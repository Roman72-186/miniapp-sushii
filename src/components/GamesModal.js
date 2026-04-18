import React, { useState, useEffect } from 'react';
import { GAMES } from '../config/games';
import '../games-modal.css';

function GamesModal({ isOpen, onClose }) {
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!isOpen) setSelectedId(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const selected = selectedId ? GAMES.find(g => g.id === selectedId) : null;

  const handlePlay = () => {
    if (!selected) return;
    window.location.href = selected.path;
  };

  return (
    <div className="games-modal__overlay" onClick={onClose}>
      <div className="games-modal__panel" onClick={e => e.stopPropagation()}>
        <button className="games-modal__close" onClick={onClose} aria-label="Закрыть">✕</button>

        {!selected ? (
          <>
            <h3 className="games-modal__title">🎮 Игры</h3>
            <div className="games-modal__list">
              {GAMES.map(game => (
                <button
                  key={game.id}
                  className="games-modal__card"
                  onClick={() => setSelectedId(game.id)}
                >
                  <span className="games-modal__card-icon">{game.icon}</span>
                  <span className="games-modal__card-name">{game.name}</span>
                  <span className="games-modal__card-desc">{game.shortDescription}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button className="games-modal__back" onClick={() => setSelectedId(null)}>
              ← К списку игр
            </button>
            <h3 className="games-modal__title">{selected.icon} {selected.name}</h3>

            <div className="games-modal__section">
              <p className="games-modal__section-title">Награда</p>
              <div className="games-modal__reward">🏆 {selected.reward}</div>
            </div>

            <div className="games-modal__section">
              <p className="games-modal__section-title">Правила</p>
              <ul className="games-modal__list-items">
                {selected.rules.map((rule, i) => <li key={i}>{rule}</li>)}
              </ul>
            </div>

            <div className="games-modal__section">
              <p className="games-modal__section-title">Условия</p>
              <ul className="games-modal__list-items">
                {selected.conditions.map((cond, i) => <li key={i}>{cond}</li>)}
              </ul>
            </div>

            <button
              className="games-modal__play"
              onClick={handlePlay}
            >
              Играть
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default GamesModal;
