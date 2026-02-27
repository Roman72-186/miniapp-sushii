// src/RollsPage.js — Страница подарочных роллов по подписке (без навигации)
import React, { useEffect, useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import { products as rawProducts } from "./data";
import "./App.css";

function normalizeRolls(list) {
  return list.map((p) => {
    const cleanName =
      typeof p.name === "string" ? p.name.replace(/\s*\*\*\s*$/u, "").trim() : p.name;

    let img = p.image || "";
    if (img.startsWith("/public/")) img = img.replace(/^\/public/u, "");
    if (!img || img === "/img/.png" || img === "/img/" || img === "/public/img/") img = "/logo.jpg";

    return {
      ...p,
      name: cleanName,
      image: img,
      price: 0,
    };
  });
}

function RollsPage() {
  const [telegramId, setTelegramId] = useState(null);

  const urlTelegramId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("telegram_id");
  }, []);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try { tg.ready(); } catch {}
      try { tg.expand?.(); } catch {}
      const tgId = tg.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null;
      setTelegramId(tgId || urlTelegramId || null);
    } else {
      setTelegramId(urlTelegramId || null);
    }
  }, [urlTelegramId]);

  const rolls = useMemo(() => normalizeRolls(rawProducts), []);

  return (
    <div className="app">
      <div className="header">
        <img src="/logo.jpg" alt="Sushi House Logo" className="logo" />
        <span>Sushi House</span>
      </div>

      <div style={{ textAlign: "center", margin: "16px 0 8px" }}>
        <h2 style={{ margin: 0, fontSize: 20, color: "#333" }}>
          Роллы по подписке
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#777" }}>
          Выберите ролл — он входит в вашу подписку
        </p>
      </div>

      <div className="products-grid">
        {rolls.map((product) => (
          <ProductCard key={product.id} product={product} telegramId={telegramId} />
        ))}
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

export default RollsPage;
