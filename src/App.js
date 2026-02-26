// src/App.js
import React, { useEffect, useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import About from "./About";
import Delivery from "./Delivery";
import CategoryNav from './components/CategoryNav'; // Импортируем компонент навигации по категориям
import "./App.css";
// Удаляем импорт статичных данных: import { products as rawProducts } from "./data";
import Success from "./Success"; // страница «Заказ принят»
import SetsPage from "./SetsPage"; // страница сетов по подписке

// code -> имя файла в /public/img
const imageByCode = {
  1000: "avokado_maki.PNG",
  1001: "age_gurme.PNG",
  1003: "alaska_kunsei.PNG",
  1004: "seegun.PNG",
  1056: "bonito_midii.PNG",
  1057: "bonito_tunec.PNG",
  1051: "boul_s_krevetkami.PNG",
  1033: "boul_s_lososem.PNG",
  1047: "boul_s_tuncom.PNG",
  1006: "bruklin.PNG",
  1008: "don_juan.PNG",
  1010: "detroit.PNG",
  1058: "zapeccheni_lite.PNG",
  1005: "losos_fair.PNG",
  1012: "miduei(1).PNG",
  1013: "Miduei.PNG",
  1014: "roll_s_bekonom.PNG",
  1059: "tori_roll.PNG",
  1060: "iguana.PNG",
  1015: "kalifornia.PNG",
  1016: "kani_gril.PNG",
  1017: "kappa_maki.PNG",
  1018: "krab_duet.PNG",
  1020: "mal_princ.PNG",
  1021: "manheten.PNG",
 1019: "midii_maki_gril.PNG",
  1062: "midii_teriaki.PNG",
  1023: "niagara.PNG",
  1024: "picantnii_losos.jpg",
  1025: "pink.PNG",
  1026: "samurai.PNG",
  1048: "Шёлковый путь.jpg",
  1031: "Поке с креветками.jpg",
  1052: "Поке с курицей.jpg",
  1027: "Спайси эби маки.jpg",
  1030: "Суши пицца №3.jpg",
  1032: "Суши сендвич с лососем.jpg",
  1034: "Сяке кунсей маки.jpg",
  1035: "Сяке маки.jpg",
  1037: "Туна маки.jpg",
  1038: "Унаги маки.jpg",
  1040: "Филадельфия лайт с огурцом.jpg",
  1042: "Фреш ролл.jpg",
  1066: "Чеддер скин ролл.jpg",
  1067: "Чизи эби.jpg",
  1044: "Чикен гриль.jpg",
  1045: "Чикен лав.jpg",
  1046: "Чука маки.jpg",
};

function normalizeProducts(list) {
  return (list || []).map((p) => {
    const cleanName =
      typeof p.name === "string" ? p.name.replace(/\s*\*\*\s*$/u, "").trim() : p.name;

    let img = imageByCode[p.id] ? `/img/${imageByCode[p.id]}` : (p.image || "");
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
  const [page, setPage] = useState("menu");
  const [isCategoryNavVisible, setCategoryNavVisible] = useState(false);

  // читаем telegram_id из URL
  const urlTelegramId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("telegram_id");
  }, []);

  // сюда положим итоговый telegramId
  const [telegramId, setTelegramId] = useState(null);

  // ⬇️ ВОТ ЭТОТ БЛОК НУЖНО ДОБАВИТЬ/ЗАМЕНИТЬ
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
  // ⬆️ КОНЕЦ БЛОКА

  // --- Новые состояния для загрузки данных с бэкенда ---
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null); // Состояние активной категории

  // Загружаем данные с бэкенда при монтировании компонента
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/menu'); // Запрос к нашему эндпоинту
        if (!response.ok) {
          throw new Error(`Ошибка загрузки меню: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        if (data.success) {
          // Нормализуем продукты, используя imageByCode
          const normalizedProducts = normalizeProducts(data.products);
          setProducts(normalizedProducts);
          setCategories(data.categories);
        } else {
          throw new Error(data.error || 'Неизвестная ошибка при загрузке меню');
        }
      } catch (err) {
        console.error('Ошибка при загрузке меню:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuData();
  }, []); // Пустой массив зависимостей означает, что эффект выполнится только один раз

  // Фильтруем продукты по активной категории
  const filteredProducts = useMemo(() => {
    if (!activeCategory) {
      return products; // Показываем все продукты, если категория не выбрана
    }
    return products.filter(product => product.category === activeCategory);
  }, [products, activeCategory]);

  // Подсчитываем количество товаров в каждой категории для отображения в CategoryNav
  const productCounts = useMemo(() => {
    const counts = {};
    products.forEach(product => {
      const catId = product.category;
      counts[catId] = (counts[catId] || 0) + 1;
    });
    return counts;
  }, [products]);


  // без условных хуков — просто флаги страниц
  const isSuccessPage =
    typeof window !== "undefined" && window.location.pathname === "/success";
  const isSetsPage =
    typeof window !== "undefined" && window.location.pathname === "/sets";

  return (
    <div className="app">
      {isSetsPage ? (
        <SetsPage />
      ) : isSuccessPage ? (
        <Success />
      ) : (
        <>
          <div className="header">
            <img src="/logo.jpg" alt="Sushi House Logo" className="logo" />
            <span onClick={() => setPage("menu")} style={{ cursor: "pointer" }}>
              Sushi House
            </span>
          </div>

          <nav className="nav">
            <button onClick={() => { setPage("menu"); setCategoryNavVisible(!isCategoryNavVisible); }}>Меню</button>
            <button onClick={() => setPage("about")}>О компании</button>
            <button onClick={() => setPage("delivery")}>Доставка и оплата</button>
          </nav>

          {page === "menu" && (
            <>
              {loading && <div>Загрузка меню...</div>}
              {error && <div>Ошибка: {error}</div>}
              {!loading && !error && (
                <>
                  {/* Вставляем компонент навигации по категориям */}
                  {isCategoryNavVisible && (
                    <>
                      {/*
                        Фильтруем категории, отображаем только нужные
                        IDs: sets, cold-rolls, hot-rolls, special
                      */}
                      {(() => {
                        const visibleCategoryIds = ['sets', 'cold-rolls', 'hot-rolls', 'special'];
                        const filteredCategories = categories.filter(cat => visibleCategoryIds.includes(cat.id));
                        
                        return (
                          <CategoryNav
                            categories={filteredCategories}
                            activeCategory={activeCategory}
                            onCategorySelect={setActiveCategory} // Передаем функцию для обновления активной категории
                            productCounts={productCounts} // Передаем подсчитанные количества
                          />
                        );
                      })()}
                    </>
                  )}
                  <div className="products-grid">
                    {filteredProducts.map((product) => (
                      <ProductCard key={product.id} product={product} telegramId={telegramId} />
                    ))}
                  </div>
                </>
              )}
            </>
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
        </>
      )}
    </div>
  );
}

export default App;
