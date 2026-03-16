// src/components/PromoBanner.js — Горизонтальный слайдер промо-баннеров
import React, { useRef, useState, useEffect } from 'react';

const BANNERS = [
  { id: 1, image: '/banners/banner-1.jpg' },
  { id: 2, placeholder: true, color: '#f5f5f5' },
  { id: 3, placeholder: true, color: '#eef6f2' },
];

function PromoBanner() {
  const scrollRef = useRef(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const scrollLeft = el.scrollLeft;
      const cardWidth = el.firstChild?.offsetWidth || el.offsetWidth;
      const idx = Math.round(scrollLeft / cardWidth);
      setActive(idx);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (idx) => {
    const el = scrollRef.current;
    if (!el || !el.children[idx]) return;
    el.children[idx].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };

  return (
    <div className="promo-banner">
      <div className="promo-banner__track" ref={scrollRef}>
        {BANNERS.map(b => (
          <div key={b.id} className="promo-banner__card">
            {b.image ? (
              <img src={b.image} alt="" className="promo-banner__img" />
            ) : (
              <div className="promo-banner__empty" style={{ background: b.color }} />
            )}
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
