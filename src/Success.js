import React, { useEffect } from "react";
import AppFooter from "./components/AppFooter";

function Success() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    try { tg?.ready(); tg?.BackButton?.hide?.(); } catch {}
  }, []);

  return (
    <div className="app" style={{ padding: 16, textAlign: "center" }}>
      <div className="header">
        <img src="/logo.jpg" alt="Sushi House Logo" className="logo" />
        <span>Sushi House</span>
      </div>

      <div style={{ maxWidth: 520, margin: "24px auto" }}>
        <h2>✅ Подарок выбран!</h2>
        <p style={{ marginTop: 8 }}>
        Спасибо, далее в боте завершите оформление заказ подарочного ролла.
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



      <AppFooter />
    </div>
  );
}

export default Success;
