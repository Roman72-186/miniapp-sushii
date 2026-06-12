import React from 'react';
import { PUBLIC_TARIFF_IDS, TARIFF_DATA, getTariffMonthPrice } from './config/tariffs';
import { usePricing } from './hooks/usePricing';
import './subscription-preview.css';

const HERO_IMAGE = '/previews/subscription-menu-photo.jpg';

const tariffCopy = {
  '290': {
    title: 'Экономия на меню',
    text: 'Для тех, кто хочет платить меньше уже со следующего заказа.',
    perks: ['-30% на холодные и запечённые роллы', '-20% на сеты', 'доступ к ценам подписчика'],
  },
  '490': {
    title: 'Скидки + подарочный ролл',
    text: 'Для тех, кто заказывает регулярно и хочет получать больше за те же деньги.',
    perks: ['все скидки тарифа 290', 'подарочный ролл каждые 15 дней', 'любой ролл до 620 ₽ на выбор'],
  },
  '1190': {
    title: 'VIP для частых заказов',
    text: 'Для семьи, офиса и тех, кто берёт роллы часто.',
    perks: ['подарочный сет каждые 30 дней', 'скидки на роллы и сеты в меню подписки', 'VIP-клуб и кофе к заказу'],
  },
};

const previewProducts = [
  { name: 'Бруклин', desc: 'Лосось, сливочный сыр, огурец', oldPrice: 560, price: 392 },
  { name: 'Гранд лосось', desc: 'Лосось, сыр, рис, нори', oldPrice: 740, price: 518 },
  { name: 'Калифорния', desc: 'Краб, тобико, огурец', oldPrice: 590, price: 413 },
  { name: 'Запечённый чиз', desc: 'Сырный соус, лосось, кунжут', oldPrice: 650, price: 455 },
];

function formatPrice(value) {
  return Number(value || 0).toLocaleString('ru-RU');
}

function SubscriptionPreviewPage() {
  const priceTable = usePricing();

  return (
    <main className="sub-preview">
      <section className="sub-preview__hero" style={{ '--hero-image': `url(${HERO_IMAGE})` }}>
        <div className="sub-preview__shade" />

        <div className="sub-preview__shell">
          <div className="sub-preview__phone">
            <header className="sub-preview__topbar">
              <div className="sub-preview__brand">
                <span className="sub-preview__logo">SH</span>
                <span>Суши-Хаус 39</span>
              </div>
              <span className="sub-preview__price-chip">290 ₽</span>
            </header>

            <nav className="sub-preview__nav" aria-label="Разделы тестовой страницы">
              <span>Главная</span>
              <span>Меню</span>
              <span>Акции</span>
              <span>Корзина</span>
            </nav>

            <section className="sub-preview__tariff-panel" aria-labelledby="sub-preview-title">
              <div className="sub-preview__panel-head">
                <div>
                  <p className="sub-preview__kicker">Меню подписчика</p>
                  <h1 id="sub-preview-title">Оформите подписку</h1>
                  <p>Выберите тариф под свой ритм заказов.</p>
                </div>
                <button type="button" aria-label="Закрыть превью">×</button>
              </div>

              <div className="sub-preview__tariffs">
                {PUBLIC_TARIFF_IDS.map((tariffId) => {
                  const price = getTariffMonthPrice(priceTable, tariffId, 1) || TARIFF_DATA[tariffId].price;
                  const item = tariffCopy[tariffId];
                  const selected = tariffId === '490';

                  return (
                    <a
                      key={tariffId}
                      className={`sub-preview__tariff${selected ? ' sub-preview__tariff--selected' : ''}`}
                      href={`/pay/${tariffId}`}
                    >
                      {selected && <span className="sub-preview__check">✓</span>}
                      <strong>{formatPrice(price)} ₽</strong>
                      <small>/ месяц</small>
                      <b>{item.title}</b>
                      <span>{item.text}</span>
                      <ul>
                        {item.perks.map((perk) => (
                          <li key={perk}>{perk}</li>
                        ))}
                      </ul>
                      <em>{selected ? 'Выбрано' : 'Выбрать'}</em>
                    </a>
                  );
                })}
              </div>
            </section>

            <section className="sub-preview__menu" aria-labelledby="popular-rolls-title">
              <h2 id="popular-rolls-title">Популярные роллы</h2>
              <div className="sub-preview__grid">
                {previewProducts.map((product) => (
                  <article className="sub-preview__product" key={product.name}>
                    <div className="sub-preview__product-photo" />
                    <div className="sub-preview__product-body">
                      <h3>{product.name}</h3>
                      <p>{product.desc}</p>
                      <span className="sub-preview__old-price">{product.oldPrice} ₽</span>
                      <span className="sub-preview__saving">Выгода {product.oldPrice - product.price} ₽</span>
                      <div className="sub-preview__product-bottom">
                        <strong>{product.price} ₽</strong>
                        <button type="button">+</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="sub-preview__pitch">
            <span>Тестовая страница</span>
            <h2>Сразу меню, сразу выгода</h2>
            <p>
              Фото работает как эмоциональный фон, а первый экран сразу показывает тарифы и реальные скидочные цены.
            </p>
            <a href="/discount-shop">Открыть текущее меню</a>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default SubscriptionPreviewPage;
