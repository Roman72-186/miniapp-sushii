import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getProductImage } from './config/imageMap';
import { getProductDescription } from './config/descriptionMap';
import ProductModal from './components/ProductModal';

const TEST_CATALOG_URL = '/test/catalog.json';

function TestCatalogCard({ product, onOpen }) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="test-card">
      <button className="test-card__image-button" onClick={() => onOpen(product)}>
        <img
          className="test-card__image"
          src={imgError ? '/logo.jpg' : product.image}
          alt={product.cleanName || product.name}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </button>
      <div className="test-card__body">
        <span className="test-card__sku">SKU {product.sku || 'нет'}</span>
        <h3 className="test-card__name">{product.cleanName || product.name}</h3>
        <div className="test-card__bottom">
          <strong className="test-card__price">{product.price}₽</strong>
          <button className="test-card__details" onClick={() => onOpen(product)}>
            Детали
          </button>
        </div>
      </div>
    </article>
  );
}

function TestCatalogPage() {
  const [catalog, setCatalog] = useState({ categories: [], products: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCategory, setVisibleCategory] = useState(null);
  const [modalProduct, setModalProduct] = useState(null);
  const sectionRefs = useRef({});
  const isScrollingByClick = useRef(false);

  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const loadCatalog = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch(`${TEST_CATALOG_URL}?v=${Date.now()}`)
      .then(response => {
        if (!response.ok) throw new Error('Не удалось загрузить тестовый каталог');
        return response.json();
      })
      .then(data => {
        const products = (data.products || []).map(item => ({
          ...item,
          image: item.image || getProductImage(item.cleanName || item.name),
          description: item.description || getProductDescription(item.cleanName || item.name),
        }));

        setCatalog({
          ...data,
          categories: data.categories || [],
          products,
          total: products.length,
        });
        setVisibleCategory(data.categories?.[0]?.id || null);
      })
      .catch(err => setError(err.message || 'Ошибка загрузки каталога'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (searchQuery) return undefined;

    const sections = Object.values(sectionRefs.current).filter(Boolean);
    if (sections.length === 0) return undefined;

    const observer = new IntersectionObserver(
      entries => {
        if (isScrollingByClick.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisibleCategory(entry.target.dataset.categoryId);
            break;
          }
        }
      },
      { rootMargin: '-124px 0px -60% 0px', threshold: 0 }
    );

    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [catalog.products, searchQuery]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return catalog.products;

    return catalog.products.filter(product => {
      const text = `${product.sku || ''} ${product.cleanName || product.name || ''} ${product.sourceCategory || ''}`.toLowerCase();
      return text.includes(query);
    });
  }, [catalog.products, searchQuery]);

  const scrollToCategory = categoryId => {
    const element = sectionRefs.current[categoryId];
    if (!element) return;

    setVisibleCategory(categoryId);
    isScrollingByClick.current = true;
    element.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      isScrollingByClick.current = false;
    }, 800);
  };

  const openProduct = product => {
    setModalProduct({
      ...product,
      description: product.description || getProductDescription(product.cleanName || product.name),
    });
  };

  return (
    <div className="shop-page test-page">
      <header className="shop-header">
        <div className="shop-header__center">
          <img src="/logo.jpg" alt="Sushi House" className="shop-header__logo" />
          <span className="shop-header__title">Обычное меню</span>
        </div>
        <span className="test-header-count">{catalog.total}</span>
      </header>

      <section className="test-hero">
        <p className="test-hero__eyebrow">/test</p>
        <h1 className="test-hero__title">Товары без подписки и скидки</h1>
        <div className="test-hero__meta">
          <span>{catalog.total} позиций</span>
          <span>{catalog.categories.length} категорий</span>
        </div>
      </section>

      <div className="shop-search test-search">
        <input
          className="shop-search__input"
          type="text"
          placeholder="Поиск по названию или SKU"
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
        />
        {searchQuery && (
          <button className="shop-search__clear" onClick={() => setSearchQuery('')}>✕</button>
        )}
      </div>

      {!searchQuery && (
        <nav className="shop-tabs test-tabs">
          {catalog.categories.map(category => (
            <button
              key={category.id}
              className={`shop-tabs__item ${visibleCategory === category.id ? 'shop-tabs__item--active' : ''}`}
              onClick={() => scrollToCategory(category.id)}
            >
              <span className="shop-tabs__icon">{category.icon}</span>
              <span className="shop-tabs__name">{category.tab}</span>
            </button>
          ))}
        </nav>
      )}

      {loading ? (
        <p className="test-state">Загружаем каталог...</p>
      ) : error ? (
        <div className="shop-error">
          <span className="shop-error__text">{error}</span>
          <button className="shop-error__retry" onClick={loadCatalog}>Попробовать снова</button>
        </div>
      ) : searchQuery ? (
        <section className="test-section">
          <h2 className="shop-section__title">Найдено: {filteredProducts.length}</h2>
          <div className="test-grid">
            {filteredProducts.map(product => (
              <TestCatalogCard key={product.id} product={product} onOpen={openProduct} />
            ))}
          </div>
        </section>
      ) : (
        catalog.categories.map(category => {
          const products = catalog.products.filter(product => product.category === category.id);
          if (products.length === 0) return null;

          return (
            <section
              key={category.id}
              className="test-section"
              data-category-id={category.id}
              ref={element => {
                sectionRefs.current[category.id] = element;
              }}
            >
              <h2 className="shop-section__title">{category.icon} {category.name}</h2>
              <div className="test-grid">
                {products.map(product => (
                  <TestCatalogCard key={product.id} product={product} onOpen={openProduct} />
                ))}
              </div>
            </section>
          );
        })
      )}

      {modalProduct && (
        <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />
      )}
    </div>
  );
}

export default TestCatalogPage;
