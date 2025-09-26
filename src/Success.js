import React, { useMemo } from "react";

function Success() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const product = params.get("product") || "Заказ";

  const closeApp = () => {
    const tg = window.Telegram?.WebApp;

    // лёгкий отклик, если поддерживается
    try { tg?.HapticFeedback?.impactOccurred?.("medium"); } catch {}

    if (tg?.showAlert) {
      tg.showAlert("Спасибо! Заказ принят. Возвращаемся в Telegram.", () => {
        // небольшая задержка повышает шанс успешного закрытия на некоторых клиентах
        setTimeout(() => { try { tg.close(); } catch {} }, 60);
      });

      // резервное закрытие, если колбэк вдруг не сработает
      setTimeout(() => { try { tg.close(); } catch {} }, 900);
    } else {
      alert("Спасибо! Заказ принят.");
      try { window.close(); } catch {}
    }
  };

  return (
    <div className="app" style={{ padding: 16, textAlign: "center" }}>
      <div className="header">
        <img src="/logo.jpg" alt="Sushi House Logo" className="logo" />
        <span>Sushi House</span>
      </div>

      <div style={{ maxWidth: 520, margin: "24px auto" }}>
        <h2>✅ Заказ принят</h2>
        <p style={{ marginTop: 8 }}>
          Спасибо! Мы получили ваш заказ{product ? `: «${product}»` : ""}.
        </p>

        <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={closeApp}>Закрыть мини-приложение</button>
        </div>
      </div>

      <footer className="footer">
        <img src="/logo.jpg" alt="Sushi House" className="footer-logo" />
        <div className="footer-info">
          <p><b>📞 Телефон:</b> +7 (401) 290-27-90</p>
          <p><b>⏰ Время работы:</b> 10:00 – 22:00</p>
          <p><b>📍 Адрес:</b> г. Калининград, ул. Ю.Гагарина, д. 16Б</p>
        </div>
      </footer>
    </div>
  );
}

export default Success;
