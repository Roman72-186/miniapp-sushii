import React from "react";
import { products } from "./data";
import ProductCard from "./ProductCard";
import "./App.css";

function App() {
  // Извлекаем telegram_id из URL
  const queryParams = new URLSearchParams(window.location.search);
  const telegramId = queryParams.get("telegram_id");

  // URL входящего вебхука (получаешь в WatBot)
  const WATBOT_WEBHOOK_URL = "https://your-watbot-webhook-url.com";

  return (
    <div className="app">
      <h1>🍣 Наше меню</h1>
      {!telegramId && (
        <p style={{ color: "red" }}>
          ❌ Ошибка: Telegram ID не передан в URL
        </p>
      )}
      <div className="products-grid">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            telegramId={telegramId}
            webhookUrl={WATBOT_WEBHOOK_URL}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
