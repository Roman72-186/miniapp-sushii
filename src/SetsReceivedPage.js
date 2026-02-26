// src/SetsReceivedPage.js — Страница «Сет в этом месяце уже получен»
import React from "react";
import "./App.css";

function SetsReceivedPage() {
  return (
    <div className="app">
      <div className="header">
        <img src="/logo.jpg" alt="Sushi House Logo" className="logo" />
        <span>Sushi House</span>
      </div>

      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        textAlign: "center",
        padding: "24px 16px",
      }}>
        <div style={{
          fontSize: 48,
          marginBottom: 16,
        }}>
          ✅
        </div>
        <h2 style={{
          margin: "0 0 12px",
          fontSize: 22,
          color: "#333",
        }}>
          Сет в этом месяце получен
        </h2>
        <p style={{
          margin: 0,
          fontSize: 15,
          color: "#777",
          maxWidth: 320,
          lineHeight: 1.5,
        }}>
          Вы уже выбрали сет по подписке в этом месяце. Следующий сет можно будет выбрать в начале следующего месяца.
        </p>
      </div>

      <footer className="footer">
        <img src="/logo.jpg" alt="Sushi House" className="footer-logo" />
        <div className="footer-info">
          <p><b>Телефон:</b> +7 (401) 290-27-90</p>
          <p><b>Время работы:</b> 10:00 – 22:00</p>
          <p><b>Адрес:</b> г. Калининград, ул. Ю.Гагарина, д. 16Б</p>
        </div>
      </footer>
    </div>
  );
}

export default SetsReceivedPage;
