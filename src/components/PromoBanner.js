// src/components/PromoBanner.js — Горизонтальный слайдер промо-баннеров (картинки + текст)
import React, { useRef, useState, useEffect } from 'react';

const BANNERS = [
  { id: 1, image: '/banners/banner-1.jpg' },
  { id: 2, image: '/banners/banner-2.jpg' },
  { id: 3, image: '/banners/banner-3.jpg' },
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
          b.image ? (
            <div key={b.id} className="promo-banner__slide promo-banner__slide--img">
              <img src={b.image} alt="" className="promo-banner__img" />
            </div>
          ) : (
            <div key={b.id} className="promo-banner__slide promo-banner__slide--text" style={{ background: b.bg }}>
              {b.emoji && <span className="promo-banner__emoji">{b.emoji}</span>}
              <div className="promo-banner__content">
                <div className="promo-banner__title">{b.title}</div>
                {b.lines && b.lines.map((line, i) => (
                  <div key={i} className="promo-banner__line">
                    {line.label && <span className="promo-banner__label">{line.label}</span>}
                    <span className="promo-banner__text">{line.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )
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
