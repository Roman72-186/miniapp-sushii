import React, { useEffect } from "react";
import { products } from "./data";
import ProductCard from "./ProductCard";
import "./App.css";

function App() {
  const queryParams = new URLSearchParams(window.location.search);
  const telegramId = queryParams.get("telegram_id");

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
    }
  }, []);

  return (
    <div className="app">
      <div className="header">
        <img src="/logo.jpg" alt="Sushi House Logo" className="logo" />
        <span>Sushi House</span>
      </div>

      {!telegramId && (
        <p style={{ color: "red", textAlign: "center" }}>
          ❌ Ошибка: Telegram ID не передан в URL
        </p>
      )}

      <div className="products-grid">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            telegramId={telegramId}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
