// src/components/ProductModal.js — Полноэкранная модалка товара (bottom-sheet)

import React, { useEffect, useRef, useCallback } from 'react';

function ProductModal({ product, onClose }) {
  const sheetRef = useRef(null);
  const touchStartY = useRef(null);
  const touchCurrentY = useRef(0);
  const isDragging = useRef(false);

  // Закрытие по Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Блокировка скролла body
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Свайп вниз для закрытия
  const handleTouchStart = useCallback((e) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    // Разрешаем свайп только если контент прокручен до верха
    if (sheet.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = 0;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current || touchStartY.current === null) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY < 0) {
      // Скролл вверх — отменяем свайп
      isDragging.current = false;
      sheet.style.transform = '';
      return;
    }
    touchCurrentY.current = deltaY;
    sheet.style.transform = `translateY(${deltaY}px)`;
    sheet.style.transition = 'none';
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.style.transition = '';
    if (touchCurrentY.current > 100) {
      onClose();
    } else {
      sheet.style.transform = '';
    }
    touchStartY.current = null;
    touchCurrentY.current = 0;
  }, [onClose]);

  if (!product) return null;

  const hasOldPrice = product.oldPrice && product.oldPrice !== product.price;
  const isGift = product.gift || product.price === 0;

  return (
    <>
      <div className="product-modal-overlay" onClick={onClose} />
      <div
        className="product-modal-sheet"
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="product-modal-sheet__handle" />

        <div className="product-modal-sheet__image-wrap">
          <img
            className="product-modal-sheet__image"
            src={product.image || '/logo.jpg'}
            alt={product.cleanName || product.name}
            onError={(e) => { e.target.src = '/logo.jpg'; }}
          />
          <button className="product-modal-sheet__close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="product-modal-sheet__content">
          <h2 className="product-modal-sheet__name">
            {product.cleanName || product.name}
          </h2>

          {product.description && (
            <p className="product-modal-sheet__desc">{product.description}</p>
          )}

          <div className="product-modal-sheet__price-row">
            {isGift ? (
              <span className="product-modal-sheet__price product-modal-sheet__price--gift">
                Подарок
              </span>
            ) : hasOldPrice ? (
              <>
                <span className="product-modal-sheet__old-price">{product.oldPrice}&#8381;</span>
                <span className="product-modal-sheet__price">{product.price}&#8381;</span>
                <span className="product-modal-sheet__savings">-{product.savings}&#8381;</span>
              </>
            ) : (
              <span className="product-modal-sheet__price">{product.price}&#8381;</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ProductModal;
