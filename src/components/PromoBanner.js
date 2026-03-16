// src/components/PromoBanner.js — Горизонтальный слайдер промо-баннеров (картинки + текст)
import React, { useRef, useState, useEffect } from 'react';

const BANNERS = [
  { id: 1, image: '/banners/banner-1.jpg' },
  {
    id: 2,
    bg: 'linear-gradient(135deg, #1a2e1a 0%, #0d1f0d 100%)',
    title: '3 тарифа на выбор',
    lines: [
      { label: '290₽', text: 'скидки 30% на роллы и 20% на сеты' },
      { label: '490₽', text: 'скидки + 2 бесплатных ролла в месяц' },
      { label: '1190₽', text: 'скидки + бесплатный сет + кофе' },
    ],
  },
  {
    id: 3,
    bg: 'linear-gradient(135deg, #2a1a1a 0%, #1f0f0f 100%)',
    title: 'Самовывоз — 4 точки',
    lines: [
      { text: 'ул. Ю.Гагарина, д. 16Б' },
      { text: 'ул. Согласия, д. 46' },
      { text: 'ул. Автомобильная, д. 12Б' },
      { text: 'Гурьевск' },
    ],
    emoji: '📍',
  },
  {
    id: 4,
    bg: 'linear-gradient(135deg, #1a1a2e 0%, #0d0d1f 100%)',
    title: 'Реферальная система',
    lines: [
      { text: 'Делитесь ссылкой с друзьями' },
      { text: 'Получайте баллы SHC за каждого' },
      { text: 'Оплачивайте баллами до 100% сета' },
    ],
    emoji: '🔥',
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
