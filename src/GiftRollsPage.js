import React, { useEffect, useState } from 'react';
import BrandLoader from './components/BrandLoader';
import { isGiftPeriodActive } from './utils/giftPeriodUtils';

function GiftRollsPage() {
  const [isPeriodActive, setIsPeriodActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверяем, активен ли период подарков
    const checkPeriod = async () => {
      try {
        const active = await isGiftPeriodActive();
        setIsPeriodActive(active);
        setLoading(false);
        
        if (active) {
          // Если период активен, переадресуем на главную страницу
          const params = new URLSearchParams(window.location.search);
          params.set('view', 'gift-rolls');
          const search = params.toString();
          window.location.replace(`/discount-shop${search ? `?${search}` : ''}`);
        }
      } catch (error) {
        console.error('Ошибка проверки периода:', error);
        setLoading(false);
      }
    };

    checkPeriod();
  }, []);

  if (loading) {
    return (
      <div className="shop-page">
        <BrandLoader text="Проверяем период доступности" />
      </div>
    );
  }

  if (!isPeriodActive) {
    return (
      <div className="shop-page">
        <div className="shop-period-inactive">
          <div className="shop-period-inactive__icon">⏰</div>
          <div className="shop-period-inactive__title">Подарки недоступны</div>
          <div className="shop-period-inactive__message">
            Подарочные роллы доступны только в определённые периоды.
            <br />
            Следите за новостями в нашем Telegram-канале.
          </div>
        </div>
      </div>
    );
  }

  // Если период активен, переадресуем на главную страницу
  return (
    <div className="shop-page">
      <BrandLoader text="Открываем подарочные роллы" />
    </div>
  );
}

export default GiftRollsPage;