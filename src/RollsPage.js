// src/RollsPage.js — Страница подарочных роллов по подписке (без навигации)
import React, { useEffect, useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import { getProductImage } from "./config/imageMap";
import "./App.css";

function normalizeProducts(list) {
  return (list || []).map((p) => {
    const cleanName =
      typeof p.name === "string" ? p.name.replace(/\s*\*\*\s*$/u, "").trim() : p.name;

    const img = getProductImage(cleanName);

    const priceNum = typeof p.price === "number" ? p.price : Number(p.price);

    return {
      ...p,
      name: cleanName,
      image: img,
      price: Number.isFinite(priceNum) ? priceNum : 0,
    };
  });
}

function RollsPage() {
  const [telegramId, setTelegramId] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/menu');
        if (!response.ok) {
          throw new Error(`Ошибка загрузки меню: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
          const normalized = normalizeProducts(data.products);
          // Только холодные и горячие роллы
          const rolls = normalized.filter(p =>
            p.category === 'cold-rolls' || p.category === 'hot-rolls'
          );

          // Убираем дубликаты по названию (оставляем первый)
          const seen = new Set();
          const unique = rolls.filter(p => {
            const key = p.name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          // Это подарочная страница — цена 0 (подарок по подписке)
          const giftRolls = unique.map(p => ({ ...p, price: 0 }));

          setProducts(giftRolls);
        } else {
          throw new Error(data.error || 'Ошибка загрузки меню');
        }
      } catch (err) {
        console.error('Ошибка при загрузке меню:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMenuData();
  }, []);

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

      {loading && <div style={{ textAlign: "center", padding: 20 }}>Загрузка...</div>}
      {error && <div style={{ textAlign: "center", padding: 20, color: "red" }}>Ошибка: {error}</div>}

      {!loading && !error && (
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} telegramId={telegramId} />
          ))}
        </div>
      )}

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
