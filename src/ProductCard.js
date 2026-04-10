import React, { useState } from "react";

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

    fireAndForgetOrder(payload);

    const tg = window.Telegram?.WebApp;

    if (CLOSE_BEHAVIOR === "redirect") {
      const url = `/success?product=${encodeURIComponent(product.name)}`;
      if (tg?.openLink) {
        tg.openLink(window.location.origin + url);
      } else {
        window.location.href = url;
      }
      return;
    }

    try { tg?.HapticFeedback?.impactOccurred?.("medium"); } catch {}
    if (tg?.showAlert) {
      tg.showAlert(`Заказ отправлен: ${product.name}`, () => {
        setTimeout(() => { try { tg.close(); } catch {} }, 50);
      });
      setTimeout(() => { try { tg.close(); } catch {} }, 800);
    } else {
      alert(`Заказ отправлен: ${product.name}`);
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
        loading="lazy"
        onError={() => setImgError(true)}
      />
      <div className="product-info">
        <h3>{product.name}</h3>
        {product.description ? <p className="product-desc">{product.description}</p> : null}
        <div className="product-bottom">
          <span className="product-price">
            {product.price === 0 ? "Подарок" : formatPrice(product.price) || "Цена уточняется"}
          </span>
          <button onClick={handleOrder}>{product.price === 0 ? "Выбрать" : "Заказать"}</button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
