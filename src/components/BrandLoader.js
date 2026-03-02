// src/components/BrandLoader.js — Брендированный лоадер с логотипом

import React from 'react';

function BrandLoader({ text = 'Собираем данные' }) {
  return (
    <div className="shop-loader">
      <div className="shop-loader__logo-wrap">
        <img src="/logo.jpg" alt="" className="shop-loader__logo" />
        <div className="shop-loader__ring" />
      </div>
      <div className="shop-loader__text">{text}</div>
      <div className="shop-loader__dots">
        <span className="shop-loader__dot" />
        <span className="shop-loader__dot" />
        <span className="shop-loader__dot" />
      </div>
    </div>
  );
}

export default BrandLoader;
