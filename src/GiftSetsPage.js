import React, { useEffect } from 'react';
import BrandLoader from './components/BrandLoader';

function GiftSetsPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('view', 'gift-sets');
    const search = params.toString();
    window.location.replace(`/discount-shop${search ? `?${search}` : ''}`);
  }, []);

  return (
    <div className="shop-page">
      <BrandLoader text="Открываем подарочные сеты" />
    </div>
  );
}

export default GiftSetsPage;
