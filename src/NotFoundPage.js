// src/NotFoundPage.js — Креативная страница 404 (суши недоступны)
import React, { useEffect } from 'react';
import './shop.css';

const KEYFRAMES = `
@keyframes nf-page-in {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes nf-float1 {
  0%, 100% { transform: translateY(0px) rotate(-5deg) scale(1); }
  50%       { transform: translateY(-18px) rotate(8deg) scale(1.06); }
}
@keyframes nf-float2 {
  0%, 100% { transform: translateY(-8px) rotate(5deg) scale(0.95); }
  50%       { transform: translateY(10px) rotate(-8deg) scale(1.08); }
}
@keyframes nf-float3 {
  0%, 100% { transform: translateY(4px) rotate(14deg); }
  50%       { transform: translateY(-14px) rotate(-10deg); }
}
@keyframes nf-bowl-spin {
  0%   { transform: rotateY(0deg)   rotateX(18deg) translateY(0px); }
  25%  { transform: rotateY(90deg)  rotateX(14deg) translateY(-6px); }
  50%  { transform: rotateY(180deg) rotateX(18deg) translateY(-10px); }
  75%  { transform: rotateY(270deg) rotateX(14deg) translateY(-6px); }
  100% { transform: rotateY(360deg) rotateX(18deg) translateY(0px); }
}
@keyframes nf-glow-pulse {
  0%, 100% { filter: drop-shadow(0 6px 16px rgba(60,200,161,0.25)); }
  50%       { filter: drop-shadow(0 10px 28px rgba(60,200,161,0.55)); }
}
@keyframes nf-code-in {
  from { opacity: 0; transform: scale(0.7) translateY(10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
`;

export default function NotFoundPage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  return (
    <div style={{
      background: '#1a1a1a',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#fff',
    }}>
      <style>{KEYFRAMES}</style>

      <div style={{
        textAlign: 'center',
        maxWidth: 340,
        animation: 'nf-page-in 0.6s ease-out both',
      }}>

        {/* 3D сцена с парящими суши */}
        <div style={{
          perspective: '500px',
          height: 110,
          position: 'relative',
          marginBottom: 4,
        }}>
          <span style={{
            position: 'absolute', left: '8%', top: '8%',
            fontSize: 42,
            animation: 'nf-float1 3.6s ease-in-out infinite',
            display: 'inline-block',
          }}>🍣</span>

          <span style={{
            position: 'absolute', right: '6%', top: '0%',
            fontSize: 38,
            animation: 'nf-float2 4.3s ease-in-out infinite',
            display: 'inline-block',
          }}>🍱</span>

          <span style={{
            position: 'absolute', left: '28%', bottom: '0%',
            fontSize: 32,
            animation: 'nf-float3 3.9s ease-in-out infinite',
            display: 'inline-block',
          }}>🥢</span>

          {/* Центральный 3D ролл */}
          <div style={{
            position: 'absolute',
            left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 64,
            display: 'inline-block',
            transformStyle: 'preserve-3d',
            animation: 'nf-bowl-spin 7s ease-in-out infinite, nf-glow-pulse 2.8s ease-in-out infinite',
          }}>
            🍜
          </div>
        </div>

        {/* 3D текст 404 */}
        <h1 style={{
          fontSize: 100,
          fontWeight: 900,
          color: '#3CC8A1',
          margin: '0 0 6px',
          lineHeight: 1,
          letterSpacing: '-3px',
          textShadow: `
            0 1px 0 #34b08e,
            0 2px 0 #2ca07e,
            0 3px 0 #24906e,
            0 4px 0 #1c805e,
            0 5px 0 #14704e,
            0 6px 0 #0c604e,
            0 8px 20px rgba(0,0,0,0.7),
            0 0 40px rgba(60,200,161,0.15)
          `,
          animation: 'nf-code-in 0.5s 0.15s ease-out both',
        }}>
          404
        </h1>

        <p style={{ fontSize: 19, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
          Суши временно недоступны
        </p>
        <p style={{ fontSize: 14, color: '#9fb0c3', margin: '0 0 36px', lineHeight: 1.65 }}>
          Что-то пошло не так на нашей кухне.<br />
          Мы уже готовим исправление!
        </p>

        {/* Кнопки */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              background: '#3CC8A1',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '15px 24px',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'opacity 0.2s, transform 0.15s',
              width: '100%',
            }}
            onMouseOver={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.opacity = '0.85'; }}
            onMouseUp={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          >
            На главную
          </button>

          <a
            href="https://t.me/roman_chatbots"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#2a2a2e',
              color: '#3CC8A1',
              border: '1px solid rgba(60,200,161,0.25)',
              borderRadius: 12,
              padding: '15px 24px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'block',
              textAlign: 'center',
              transition: 'opacity 0.2s, border-color 0.2s, transform 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#3CC8A1'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(60,200,161,0.25)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
          >
            💬 Техническая поддержка
          </a>
        </div>
      </div>
    </div>
  );
}
