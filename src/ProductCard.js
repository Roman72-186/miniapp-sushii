import React, { useState } from "react";

// 'alert_close' — показать alert и закрыть мини-апп в колбэке
// 'redirect'    — перейти на страницу /success
// const CLOSE_BEHAVIOR = "alert_close"; // поменяй на "redirect", если нужен переход
const CLOSE_BEHAVIOR = "redirect";


function formatPrice(price) {
  if (typeof price !== "number" || Number.isNaN(price)) return "";
  return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
}

function ProductCard({ product, telegramId }) {
  const [imgError, setImgError] = useState(false);

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
    } catch {}
  };

  const handleOrder = () => {
    const payload = {
      telegram_id: telegramId || null,
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      code: product.code || "",
    };

    // отправляем заказ без ожидания ответа
    fireAndForgetOrder(payload);

    const tg = window.Telegram?.WebApp;

    if (CLOSE_BEHAVIOR === "redirect") {
      // Перейдём на страницу "Заказ принят"
      const url = `/success?product=${encodeURIComponent(product.name)}`;
      if (tg?.openLink) {
        // безопасный способ внутри Telegram WebApp
        tg.openLink(window.location.origin + url);
      } else {
        window.location.href = url;
      }
      return;
    }

    // По умолчанию: alert -> закрыть мини-апп
    try { tg?.HapticFeedback?.impactOccurred?.("medium"); } catch {}
    if (tg?.showAlert) {
      tg.showAlert(`✅ Заказ отправлен: ${product.name}`, () => {
        setTimeout(() => { try { tg.close(); } catch {} }, 50);
      });
      // дубль через таймер (иногда колбэк не триггерится)
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
