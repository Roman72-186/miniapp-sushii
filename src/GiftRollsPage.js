import React, { useEffect } from 'react';
import BrandLoader from './components/BrandLoader';

function GiftRollsPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('view', 'gift-rolls');
    const search = params.toString();
    window.location.replace(`/discount-shop${search ? `?${search}` : ''}`);
  }, []);

  return (
    <div className="shop-page">
      <BrandLoader text="Открываем подарочные роллы" />
    </div>
  );
}

export default GiftRollsPage;
