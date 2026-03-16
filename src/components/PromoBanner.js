// src/components/PromoBanner.js — Горизонтальный слайдер промо-баннеров (из API)
import React, { useRef, useState, useEffect } from 'react';

const FALLBACK = [
  { id: 1, image: '/banners/banner-1.jpg' },
  { id: 2, placeholder: true, color: '#f5f5f5' },
  { id: 3, placeholder: true, color: '#eef6f2' },
];

function PromoBanner() {
  const scrollRef = useRef(null);
  const [active, setActive] = useState(0);
  const [banners, setBanners] = useState(FALLBACK);

  useEffect(() => {
    fetch('/api/admin/banners')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.banners?.length > 0) setBanners(data.banners);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const cardWidth = el.firstChild?.offsetWidth || el.offsetWidth;
      const idx = Math.round(el.scrollLeft / cardWidth);
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

  // Не показываем если все пустые
  const hasContent = banners.some(b => b.image);
  if (!hasContent) return null;

  return (
    <div className="promo-banner">
      <div className="promo-banner__track" ref={scrollRef}>
        {banners.map(b => (
          <div key={b.id} className="promo-banner__card">
            {b.image ? (
              <img src={b.image + '?v=' + Date.now()} alt="" className="promo-banner__img" />
            ) : (
              <div className="promo-banner__empty" style={{ background: b.color || '#f5f5f5' }} />
            )}
          </div>
        ))}
      </div>
      {banners.length > 1 && (
        <div className="promo-banner__dots">
          {banners.map((b, i) => (
            <span
              key={b.id}
              className={`promo-banner__dot ${i === active ? 'promo-banner__dot--active' : ''}`}
              onClick={() => scrollTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default PromoBanner;
