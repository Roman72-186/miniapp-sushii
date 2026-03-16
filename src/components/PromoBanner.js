// src/components/PromoBanner.js — Горизонтальный слайдер промо-баннеров
import React, { useRef, useState, useEffect } from 'react';

const BANNERS = [
  {
    id: 1,
    bg: 'linear-gradient(135deg, #1a3a2a 0%, #0f2a1f 100%)',
    title: 'Бесплатная доставка',
    text: 'При заказе от 1 000₽ — доставка бесплатно по всему городу',
    emoji: '🚗',
  },
  {
    id: 2,
    bg: 'linear-gradient(135deg, #2a1a3a 0%, #1f0f2a 100%)',
    title: 'Топпинги к роллам',
    text: 'Соевый соус, имбирь и васаби — всегда в комплекте',
    emoji: '🥢',
  },
  {
    id: 3,
    bg: 'linear-gradient(135deg, #3a2a1a 0%, #2a1f0f 100%)',
    title: 'Скидки по подписке',
    text: 'До 30% на роллы и 20% на сеты — каждый день',
    emoji: '💰',
  },
  {
    id: 4,
    bg: 'linear-gradient(135deg, #1a2a3a 0%, #0f1f2a 100%)',
    title: 'Самовывоз — 4 точки',
    text: 'Гагарина 16Б, Согласия 46, Автомобильная 12Б, Гурьевск',
    emoji: '📍',
  },
];

function PromoBanner() {
  const scrollRef = useRef(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const scrollLeft = el.scrollLeft;
      const width = el.offsetWidth;
      const idx = Math.round(scrollLeft / width);
      setActive(idx);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (idx) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.offsetWidth, behavior: 'smooth' });
  };

  return (
    <div className="promo-banner">
      <div className="promo-banner__track" ref={scrollRef}>
        {BANNERS.map(b => (
          <div key={b.id} className="promo-banner__slide" style={{ background: b.bg }}>
            <span className="promo-banner__emoji">{b.emoji}</span>
            <div className="promo-banner__content">
              <div className="promo-banner__title">{b.title}</div>
              <div className="promo-banner__text">{b.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="promo-banner__dots">
        {BANNERS.map((b, i) => (
          <span
            key={b.id}
            className={`promo-banner__dot ${i === active ? 'promo-banner__dot--active' : ''}`}
            onClick={() => scrollTo(i)}
          />
        ))}
      </div>
    </div>
  );
}

export default PromoBanner;
