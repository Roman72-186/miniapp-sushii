// src/ProductCard.js
import React, { useState } from "react";

function formatPrice(price) {
  if (typeof price !== "number" || Number.isNaN(price)) return "";
  return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
}

function ProductCard({ product, telegramId }) {
  const [imgError, setImgError] = useState(false);

  const handleOrder = () => {
    const payload = {
      telegram_id: telegramId || null,
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      code: product.code || ""
    };

    // 1) Отправляем заказ без ожидания ответа
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json"
        });
        navigator.sendBeacon("/api/order", blob);
      } else {
        // fire-and-forget
        fetch("/api/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true, // подсказка браузеру не рвать запрос при закрытии
        }).catch(() => {});
      }
    } catch (e) {
      // Логируем, но не мешаем закрытию
      console.error("send order error:", e);
    }

    // 2) Мгновенно закрываем WebApp
    if (window.Telegram?.WebApp?.close) {
      window.Telegram.WebApp.close();
    } else {
      // запасной вариант
      window.close();
    }
  };

  const imageSrc = imgError ? "/logo.jpg" : product.image;

  return (
    <div className="product-card">
      <img
        src={imageSrc}
        alt={product.name}
        className="product-img"
        onError={() => setImgError(true)}
      />
      <h3>{product.name}</h3>
      {product.description ? <p>{product.description}</p> : null}
      <p>
        <b>{formatPrice(product.price) || "Цена уточняется"}</b>
      </p>

      <button onClick={handleOrder}>
        Заказать
      </button>
    </div>
  );
}

export default ProductCard;
