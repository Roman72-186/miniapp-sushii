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

      // Если заказ успешно отправлен
      if (result.status === "ok") {
        alert(`✅ Заказ получен: ${product.name}`);

        // Попытка закрыть мини-апп в Telegram
        if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.close();
        }
      } else {
        alert("❌ Ошибка: не удалось отправить заказ");
      }
    } catch (error) {
      alert("❌ Ошибка при отправке заказа");
      console.error(error);
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
