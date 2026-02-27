// src/App.js
import React, { useEffect, useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import About from "./About";
import Delivery from "./Delivery";
import CategoryNav from './components/CategoryNav'; // Импортируем компонент навигации по категориям
import "./App.css";
import { getProductImage } from "./config/imageMap";
import Success from "./Success"; // страница «Заказ принят»
import SetsPage from "./SetsPage"; // страница сетов по подписке
import SetsReceivedPage from "./SetsReceivedPage"; // страница «сет уже получен»
import RollsPage from "./RollsPage"; // страница подарочных роллов по подписке

function normalizeProducts(list) {
  return (list || []).map((p) => {
    const cleanName =
      typeof p.name === "string" ? p.name.replace(/\s*\*\*\s*$/u, "").trim() : p.name;

    // Ищем картинку по названию товара
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

  // Только роллы (холодные и горячие) — без имбиря, соусов, напитков и прочего
  const rollsOnly = useMemo(() => {
    return products.filter(product =>
      product.category === 'cold-rolls' || product.category === 'hot-rolls'
    );
  }, [products]);

  // Фильтруем по активной категории (внутри роллов)
  const filteredProducts = useMemo(() => {
    if (!activeCategory) {
      return rollsOnly;
    }
    return rollsOnly.filter(product => product.category === activeCategory);
  }, [rollsOnly, activeCategory]);

  // Подсчитываем количество товаров в каждой категории (только роллы)
  const productCounts = useMemo(() => {
    const counts = {};
    rollsOnly.forEach(product => {
      const catId = product.category;
      counts[catId] = (counts[catId] || 0) + 1;
    });
    return counts;
  }, [rollsOnly]);


  // без условных хуков — просто флаги страниц
  const isSuccessPage =
    typeof window !== "undefined" && window.location.pathname === "/success";
  const isSetsPage =
    typeof window !== "undefined" && window.location.pathname === "/sets";
  const isSetsReceivedPage =
    typeof window !== "undefined" && window.location.pathname === "/sets-received";
  const isRollsPage =
    typeof window !== "undefined" && window.location.pathname === "/rolls";

  return (
    <div className="app">
      {isSetsReceivedPage ? (
        <SetsReceivedPage />
      ) : isSetsPage ? (
        <SetsPage />
      ) : isRollsPage ? (
        <RollsPage />
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
                        const visibleCategoryIds = ['cold-rolls', 'hot-rolls'];
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
