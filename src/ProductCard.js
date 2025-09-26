// src/components/ProductCard.js
import React, { useState } from "react";

function formatPrice(price) {
  if (typeof price !== "number" || Number.isNaN(price)) return "";
  return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
}

function ProductCard({ product, telegramId }) {
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleOrder = async () => {
    setLoading(true);

    const payload = {
      telegram_id: telegramId,            // может быть null/undefined — сервер ответит ошибкой
      product_id: product.id,
      product_name: product.name,
      price: product.price,               // 0 допустим — это на вашей стороне бизнес-логика
      code: product.code || ""
    };

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.status === "ok") {
        const message = `✅ Заказ получен: ${product.name}`;
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.showAlert(message, () => {
            window.Telegram.WebApp.close();
          });
        } else {
          alert(message);
        }
      } else {
        const message = result?.error
          ? `❌ Ошибка: ${result.error}`
          : "❌ Ошибка: не удалось отправить заказ";
        window.Telegram?.WebApp?.showAlert(message) || alert(message);
      }
    } catch (error) {
      const message = "❌ Ошибка при отправке заказа";
      window.Telegram?.WebApp?.showAlert(message) || alert(message);
      console.error(error);
    } finally {
      setLoading(false);
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

      <button onClick={handleOrder} disabled={loading}>
        {loading ? "Отправка..." : "Заказать"}
      </button>
    </div>
  );
}

export default ProductCard;
