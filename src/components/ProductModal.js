// src/components/ProductModal.js — Полноэкранная модалка товара (bottom-sheet)

import React, { useRef, useCallback } from 'react';
import OptimizedImage from './OptimizedImage';
import ModalPortal from './ModalPortal';

function ProductModal({ product, onClose }) {
  const sheetRef = useRef(null);
  const closeButtonRef = useRef(null);
  const touchStartY = useRef(null);
  const touchCurrentY = useRef(0);
  const isDragging = useRef(false);

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
    <ModalPortal onClose={onClose} initialFocusRef={closeButtonRef}>
      <div className="product-modal-overlay" onClick={onClose} />
      <div
        className="product-modal-sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        tabIndex="-1"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="product-modal-sheet__handle" />

        <div className="product-modal-sheet__image-wrap">
          <OptimizedImage
            className="product-modal-sheet__image"
            src={product.image || '/logo.jpg'}
            alt={product.cleanName || product.name}
            loading="eager"
            width={960}
            widths={[480, 640, 960, 1280]}
            sizes="(max-width: 720px) 100vw, 720px"
          />
          <button
            ref={closeButtonRef}
            type="button"
            className="product-modal-sheet__close"
            onClick={onClose}
            aria-label="Закрыть карточку товара"
          >
            &times;
          </button>
        </div>

        <div className="product-modal-sheet__content">
          <h2 id="product-modal-title" className="product-modal-sheet__name">
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
    </ModalPortal>
  );
}

export default ProductModal;
