// src/App.js
import React, { useEffect, useMemo, useState } from "react";
import About from "./About";
import Delivery from "./Delivery";
import "./App.css";
import Success from "./Success"; // страница «Заказ принят»
import SetsPage from "./SetsPage"; // страница сетов по подписке
import SetsReceivedPage from "./SetsReceivedPage"; // страница «сет уже получен»
import RollsPage from "./RollsPage"; // страница подарочных роллов по подписке

function App() {
  const [page, setPage] = useState("home");
  const [loadingButton, setLoadingButton] = useState(null); // какая кнопка сейчас грузится
  const [subscriptionError, setSubscriptionError] = useState(null);

  // читаем telegram_id из URL
  const urlTelegramId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("telegram_id");
  }, []);

  // сюда положим итоговый telegramId
  const [telegramId, setTelegramId] = useState(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try { tg.ready(); } catch {}
      try { tg.expand?.(); } catch {}
      const tgId = tg.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null;
      setTelegramId(tgId || urlTelegramId || null);
    } else {
      setTelegramId(urlTelegramId || null);
    }
  }, [urlTelegramId]);

  // Проверка подписки и переход на страницу
  const handleSubscriptionCheck = async (requiredType) => {
    if (!telegramId) {
      setSubscriptionError("Telegram ID не найден");
      return;
    }

    setLoadingButton(requiredType);
    setSubscriptionError(null);

    try {
      const response = await fetch('/api/check-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: telegramId }),
      });

      const data = await response.json();

      if (!data.hasSubscription) {
        setSubscriptionError("Подписка не найдена");
        return;
      }

      // Тариф 290 = скидки на меню, 490 = роллы, 1190 = сеты
      if (requiredType === 'discount-sets' && data.tarif === '290') {
        // TODO: переход на страницу сетов со скидкой -20%
        setSubscriptionError("Раздел скоро появится");
      } else if (requiredType === 'discount-hot' && data.tarif === '290') {
        // TODO: переход на страницу запечённых роллов со скидкой -30₽
        setSubscriptionError("Раздел скоро появится");
      } else if (requiredType === 'discount-cold' && data.tarif === '290') {
        // TODO: переход на страницу холодных роллов со скидкой -30₽
        setSubscriptionError("Раздел скоро появится");
      } else if (requiredType === 'rolls' && (data.tarif === '490' || data.tarif === '1190')) {
        window.location.href = '/rolls';
      } else if (requiredType === 'sets' && data.tarif === '1190') {
        window.location.href = '/sets';
      } else if (requiredType === 'sets' && data.tarif === '490') {
        setSubscriptionError("Ваша подписка не включает сеты");
      } else if (data.tarif === '290' && !requiredType.startsWith('discount')) {
        setSubscriptionError("Ваш тариф не включает этот раздел");
      } else {
        setSubscriptionError("Подписка не найдена");
      }
    } catch (err) {
      console.error('Ошибка проверки подписки:', err);
      setSubscriptionError("Ошибка проверки подписки");
    } finally {
      setLoadingButton(null);
    }
  };

  // без условных хуков — просто флаги страниц
  const isSuccessPage =
    typeof window !== "undefined" && window.location.pathname === "/success";
  const isSetsPage =
    typeof window !== "undefined" && window.location.pathname === "/sets";
  const isSetsReceivedPage =
    typeof window !== "undefined" && window.location.pathname === "/sets-received";
  const isRollsPage =
    typeof window !== "undefined" && window.location.pathname === "/rolls";

  return (
    <div className="app">
      {isSetsReceivedPage ? (
        <SetsReceivedPage />
      ) : isSetsPage ? (
        <SetsPage />
      ) : isRollsPage ? (
        <RollsPage />
      ) : isSuccessPage ? (
        <Success />
      ) : (
        <>
          <div className="header">
            <img src="/logo.jpg" alt="Sushi House Logo" className="logo" />
            <span>Sushi House</span>
          </div>

          <nav className="nav">
            <button onClick={() => setPage("home")}>Главная</button>
            <button onClick={() => setPage("about")}>О компании</button>
            <button onClick={() => setPage("delivery")}>Доставка и оплата</button>
          </nav>

          {page === "home" && (
            <div className="subscription-buttons">
              <button
                className="subscription-btn discount-btn"
                onClick={() => handleSubscriptionCheck('discount-sets')}
                disabled={!!loadingButton}
              >
                {loadingButton === 'discount-sets' ? 'Проверка...' : 'Сеты по подписке -20%'}
              </button>
              <button
                className="subscription-btn discount-btn"
                onClick={() => handleSubscriptionCheck('discount-hot')}
                disabled={!!loadingButton}
              >
                {loadingButton === 'discount-hot' ? 'Проверка...' : '-30₽ на запечённый ролл'}
              </button>
              <button
                className="subscription-btn discount-btn"
                onClick={() => handleSubscriptionCheck('discount-cold')}
                disabled={!!loadingButton}
              >
                {loadingButton === 'discount-cold' ? 'Проверка...' : '-30₽ на холодный ролл'}
              </button>
              <button
                className="subscription-btn rolls-btn"
                onClick={() => handleSubscriptionCheck('rolls')}
                disabled={!!loadingButton}
              >
                {loadingButton === 'rolls' ? 'Проверка...' : 'Роллы по подписке'}
              </button>
              <button
                className="subscription-btn sets-btn"
                onClick={() => handleSubscriptionCheck('sets')}
                disabled={!!loadingButton}
              >
                {loadingButton === 'sets' ? 'Проверка...' : 'Сеты по подписке'}
              </button>
              {subscriptionError && (
                <div className="subscription-error">{subscriptionError}</div>
              )}
            </div>
          )}

          {page === "about" && <About />}
          {page === "delivery" && <Delivery />}

          <footer className="footer">
            <img src="/logo.jpg" alt="Sushi House" className="footer-logo" />
            <div className="footer-info">
              <p><b>📞 Телефон:</b> +7 (401) 290-27-90</p>
              <p><b>⏰ Время работы:</b> 10:00 – 22:00</p>
              <p><b>📍 Адрес:</b> г. Калининград, ул. Ю.Гагарина, д. 16Б</p>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
