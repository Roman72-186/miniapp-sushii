import React, { useState } from "react";

function formatPrice(price) {
  if (typeof price !== "number" || Number.isNaN(price)) return "";
  return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
}

function ProductCard({ product, telegramId }) {
  const [imgError, setImgError] = useState(false);

  // отправляем заказ «fire-and-forget», чтобы не ждать ответа
  const fireAndForgetOrder = (payload) => {
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon("/api/order", blob);
      } else {
        fetch("/api/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      /* игнорируем — UX важнее */
    }
  };

  const handleOrder = () => {
    const payload = {
      telegram_id: telegramId || null,
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      code: product.code || "",
    };

    fireAndForgetOrder(payload);

    const tg = window.Telegram?.WebApp;

    // лёгкий хаптик, если доступен
    try { tg?.HapticFeedback?.impactOccurred?.("medium"); } catch {}

    // показываем алерт и закрываем в колбэке
    if (tg?.showAlert) {
      tg.showAlert(`✅ Заказ отправлен: ${product.name}`, () => {
        setTimeout(() => { try { tg.close(); } catch {} }, 50);
      });
      // fallback-таймер на случай, если колбэк не сработает
      setTimeout(() => { try { tg.close(); } catch {} }, 800);
    } else {
      alert(`✅ Заказ отправлен: ${product.name}`);
      try { window.close(); } catch {}
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
      <p><b>{formatPrice(product.price) || "Цена уточняется"}</b></p>

      <button onClick={handleOrder}>Заказать</button>
    </div>
  );
}

export default ProductCard;
