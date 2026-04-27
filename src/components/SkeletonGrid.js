// src/components/SkeletonGrid.js — Шиммер-скелетон для сетки товаров

import React from 'react';

function SkeletonCard() {
  return (
    <div className="shop-skeleton-card">
      <div className="shop-skeleton-card__image" />
      <div className="shop-skeleton-card__body">
        <div className="shop-skeleton-card__line shop-skeleton-card__line--title" />
        <div className="shop-skeleton-card__line shop-skeleton-card__line--price" />
        <div className="shop-skeleton-card__line shop-skeleton-card__line--btn" />
      </div>
    </div>
  );
}

function SkeletonGrid({ count = 6 }) {
  return (
    <div className="shop-skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default SkeletonGrid;
