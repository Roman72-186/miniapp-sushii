import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getProductImage } from './config/imageMap';
import { getProductDescription } from './config/descriptionMap';
import ProductModal from './components/ProductModal';
import OptimizedImage from './components/OptimizedImage';

const TEST_CATALOG_URL = '/test/catalog.json';

function TestCatalogCard({ product, onOpen }) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="shop-card test-menu-card">
      <div
        className="shop-card__image-wrap"
        onClick={() => onOpen(product)}
        style={{ cursor: 'pointer' }}
      >
        <OptimizedImage
          className="shop-card__image"
          src={imgError ? '/logo.jpg' : product.image}
          alt={product.cleanName || product.name}
          loading="lazy"
          onError={() => setImgError(true)}
          width={480}
          widths={[240, 320, 480, 640]}
          sizes="(max-width: 520px) 50vw, (max-width: 900px) 33vw, 260px"
        />
        <div className="shop-card__action-overlay" onClick={event => event.stopPropagation()}>
          <button className="shop-card__add-btn" onClick={() => onOpen(product)}>
            Подробнее
          </button>
        </div>
      </div>
      <div className="shop-card__body">
        <h3 className="shop-card__name">{product.cleanName || product.name}</h3>
        <p className="test-menu-card__sku">SKU {product.sku || 'нет'}</p>
        <div className="shop-card__prices">
          <span className="shop-card__price">{product.price}₽</span>
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
          <span className="shop-header__title">Sushi House</span>
        </div>
        <span className="test-header-count">{catalog.total}</span>
      </header>

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
        <section className="shop-section test-section">
          <h2 className="shop-section__title">Найдено: {filteredProducts.length}</h2>
          <div className="shop-grid">
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
              className="shop-section test-section"
              data-category-id={category.id}
              ref={element => {
                sectionRefs.current[category.id] = element;
              }}
            >
              <h2 className="shop-section__title">{category.icon} {category.name}</h2>
              <div className="shop-grid">
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
