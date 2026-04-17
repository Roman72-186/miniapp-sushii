// src/SetsPage.js — Страница каталога сетов по подписке
import React, { useEffect, useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import { subscriptionSets } from "./data-sets";
import AppFooter from "./components/AppFooter";
import "./App.css";

function normalizeSets(list) {
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

function SetsPage() {
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

  const sets = useMemo(() => normalizeSets(subscriptionSets).filter(p => p.enabled !== false), []);

  return (
    <div className="app">
      <div className="header">
        <img src="/logo.jpg" alt="Sushi House Logo" className="logo" />
        <span>Sushi House</span>
      </div>

      <div style={{ textAlign: "center", margin: "16px 0 8px" }}>
        <h2 style={{ margin: 0, fontSize: 20, color: "#333" }}>
          Сеты по подписке
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#777" }}>
          Выберите сет — он входит в вашу подписку
        </p>
        {/* DEBUG: убрать после отладки */}
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "#bbb" }}>
          TG ID: {telegramId || "не получен"} | URL param: {new URLSearchParams(window.location.search).get("telegram_id") || "нет"} | WebApp: {window.Telegram?.WebApp?.initDataUnsafe?.user?.id || "нет"}
        </p>
      </div>

      <div className="products-grid">
        {sets.map((product) => (
          <ProductCard key={product.id} product={product} telegramId={telegramId} />
        ))}
      </div>

      <AppFooter />
    </div>
  );
}

export default SetsPage;
