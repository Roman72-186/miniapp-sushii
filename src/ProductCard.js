import React from "react";

function ProductCard({ product, telegramId }) {
  const handleOrder = async () => {
    const payload = {
      telegram_id: telegramId,
      product_id: product.id,
      product_name: product.name,
      price: product.price
    };

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.status === "ok") {
        // ✅ Сразу закрываем мини-апп
        if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.close();
        } else {
          console.log("❌ WebApp объект не найден (возможно открыто не в Telegram)");
        }
      } else {
        console.log("❌ Ошибка: не удалось отправить заказ");
      }
    } catch (error) {
      console.error("❌ Ошибка при отправке заказа", error);
    }
  };

  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} className="product-img" />
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <p><b>{product.price} ₽</b></p>
      <button onClick={handleOrder}>Заказать</button>
    </div>
  );
}

export default ProductCard;
