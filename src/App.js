import React, { useEffect, useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import About from "./About";
import Delivery from "./Delivery";
import "./App.css";
import { products as rawProducts } from "./data";
import Success from "./Success"; // <— добавили

const imageByCode = {
  1000: "avokado_maki.PNG",
  1001: "age_gurme.PNG",
  1003: "alaska_kunsei.PNG",
  1004: "seegun.PNG",
  1056: "bonito_midii.PNG",
  1057: "bonito_tunec.PNG",
  1051: "boul_s_krevetkami.PNG",
  1033: "boul_s_lososom.PNG",
  1047: "boul_s_tuncom.PNG",
  1006: "bruklin.PNG",
  1007: "glamur.PNG",
  1008: "don_juan.PNG",
  1009: "gujji.PNG",
  1010: "detroit.PNG",
  1058: "zapeccheni_lite.PNG",
  1005: "losos_fair.PNG",
  1012: "Miduei.PNG",
  1013: "miduei(1).PNG",
  1014: "roll_s_bekonom.PNG",
  1059: "tori_roll.PNG",
  1060: "iguana.PNG",
  1015: "kalifornia.PNG",
  1016: "kani_gril.PNG",
  1017: "kappa_maki.PNG",
  1061: "kioto_chiken.PNG",
  1018: "krab_duet.PNG",
  1020: "mal_princ.PNG",
  1021: "manheten.PNG",
  1019: "midii_maki_gril.PNG",
  1062: "midii_teriaki.PNG",
  1022: "nejni_kiss.PNG",
  1023: "niagara.PNG",
  1024: "picantnii_losos.jpg",
  1025: "pink.PNG",
  1026: "samurai.PNG",
  1048: "e.png",
};

function normalizeProducts(list) {
  return (list || []).map((p) => {
    const cleanName =
      typeof p.name === "string" ? p.name.replace(/\s*\*\*\s*$/u, "").trim() : p.name;

    let img = imageByCode[p.code] ? `/img/${imageByCode[p.code]}` : (p.image || "");
    if (img.startsWith("/public/")) img = img.replace(/^\/public/u, "");
    if (!img || img === "/img/.png" || img === "/img/" || img === "/public/img/") img = "/logo.jpg";

    const priceNum = typeof p.price === "number" ? p.price : Number(p.price);

    return {
      ...p,
      name: cleanName,
      image: img,
      price: Number.isFinite(priceNum) ? priceNum : 0,
    };
  });
}

function App() {
  // Если путь /success — показываем страницу успеха и всё
  if (typeof window !== "undefined" && window.location.pathname === "/success") {
    return <Success />;
  }

  const [page, setPage] = useState("menu");

  const urlTelegramId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("telegram_id");
  }, []);

  const [telegramId, setTelegramId] = useState(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      if (tg.expand) tg.expand();
      const tgId = tg.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null;
      setTelegramId(tgId || urlTelegramId || null);
    } else {
      setTelegramId(urlTelegramId || null);
    }
  }, [urlTelegramId]);

  const products = useMemo(() => normalizeProducts(rawProducts), []);

  return (
    <div className="app">
      <div className="header">
        <img src="/logo.jpg" alt="Sushi House Logo" className="logo" />
        <span onClick={() => setPage("menu")} style={{ cursor: "pointer" }}>
          Sushi House
        </span>
      </div>

      <nav className="nav">
        <button onClick={() => setPage("menu")}>Меню</button>
        <button onClick={() => setPage("about")}>О компании</button>
        <button onClick={() => setPage("delivery")}>Доставка и оплата</button>
      </nav>

      {page === "menu" && (
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} telegramId={telegramId} />
          ))}
        </div>
      )}

      {page === "about" && <About />}
      {page === "delivery" && <Delivery />}

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

export default App;
