import React, { useEffect, useMemo } from "react";

function Success() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const product = params.get("product") || "Заказ";

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    try { tg?.ready(); tg?.BackButton?.hide?.(); } catch {}
  }, []);

  const closeApp = () => {
    const tg = window.Telegram?.WebApp;

    try { tg?.HapticFeedback?.impactOccurred?.("medium"); } catch {}

    if (tg?.showAlert) {
      tg.showAlert("Спасибо! Подарок выбран. Возвращаемся в Telegram.", () => {
        setTimeout(() => { try { tg.close(); } catch {} }, 60);
      });
      setTimeout(() => { try { tg.requestClose?.(); } catch {} }, 900);
    } else {
      // Вне Telegram просто закрыть вкладку не получится — оставим alert как фолбэк
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
        <h2>✅ Подарок выбран!</h2>
        <p style={{ marginTop: 8 }}>
            Спасибо! Мы получили ваш заказ
            {product ? `: «${product}»` : ""}.
            <br />
            <span style={{ fontWeight: "bold", color: "red" }}>
            Закройте окно и вернитесь в бот
            </span>
        </p>

        <div
            style={{
            marginTop: 24,
            display: "flex",
            gap: 12,
            justifyContent: "center",
            }}
        ></div>
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
