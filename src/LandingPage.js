import React, { useEffect } from 'react';
import AppFooter from './components/AppFooter';
import { useUser } from './UserContext';

const SITE_URL = 'https://sushi-house-39.ru';
const HERO_IMAGE = '/new_set/%D0%A1%D0%B5%D1%82%20%C2%AB%D0%A2%D0%B8%D1%85%D0%B8%D0%B9%20%D0%B2%D0%B5%D1%87%D0%B5%D1%80%C2%BB.jpg';

const seo = {
  title: 'Суши-Хаус 39 - подписка на суши и роллы в Калининграде',
  description:
    'Подписка Суши-Хаус 39 помогает экономить на каждом заказе: до 30% на роллы, до 20% на сеты, подарочные периоды, SHC-баллы и меню подписки онлайн в Калининграде.',
  canonical: SITE_URL,
  image: `${SITE_URL}${HERO_IMAGE}`,
};

const defaultHeroLead = (
  <>
    Если роллы и сеты уже есть в вашем обычном месяце, подписка возвращает
    часть бюджета: скидки, подарки, SHC-баллы и отдельное меню подписчика.
  </>
);

const expiredHeroLead = (
  <>
    Ваша подписка закончилась. Продлите тариф, чтобы снова открыть цены
    подписчика, подарочные периоды и заказы через меню подписки.
  </>
);

const valuePoints = [
  {
    stat: '-30%',
    title: 'на каждый ролл',
    text: 'Покупаете любимые холодные и запеченные роллы дешевле каждый раз, когда заходите в меню подписки.',
  },
  {
    stat: '-20%',
    title: 'на большие сеты',
    text: 'Семейный ужин, встреча с друзьями или заказ в офис становится заметно выгоднее без промокодов.',
  },
  {
    stat: '15/30',
    title: 'дней до подарка',
    text: 'В тарифе 690 ₽ открывается подарочный ролл каждые 15 дней, а в VIP-тарифе 1 390 ₽ - подарочный сет каждые 30 дней.',
  },
  {
    stat: 'SHC',
    title: 'баллы за друзей',
    text: 'Приглашайте друзей и копите SHC как внутренний баланс для следующих заказов в подписке.',
  },
];

const savings = [
  { label: 'Вечер с роллами на 1 500 ₽', regular: '1 500 ₽', subscriber: '1 050 ₽', profit: '450 ₽' },
  { label: 'Заказ сетов на компанию', regular: '3 000 ₽', subscriber: '2 400 ₽', profit: '600 ₽' },
  { label: '4 заказа роллов за месяц', regular: '6 000 ₽', subscriber: '4 200 ₽', profit: '1 800 ₽' },
];

const savingsCurve = [
  { label: '1 заказ', regular: '1 500 ₽', subscriber: '1 050 ₽', profit: '+450 ₽', x: 34, regularY: 142, subscriberY: 152 },
  { label: '2 заказа', regular: '3 000 ₽', subscriber: '2 100 ₽', profit: '+900 ₽', x: 132, regularY: 108, subscriberY: 128 },
  { label: '3 заказа', regular: '4 500 ₽', subscriber: '3 150 ₽', profit: '+1 350 ₽', x: 230, regularY: 74, subscriberY: 104 },
  { label: '4 заказа', regular: '6 000 ₽', subscriber: '4 200 ₽', profit: '+1 800 ₽', x: 328, regularY: 40, subscriberY: 80 },
];

const regularLine = savingsCurve.map((point) => `${point.x},${point.regularY}`).join(' ');
const subscriberLine = savingsCurve.map((point) => `${point.x},${point.subscriberY}`).join(' ');
const savingsArea = [
  ...savingsCurve.map((point) => `${point.x},${point.regularY}`),
  ...[...savingsCurve].reverse().map((point) => `${point.x},${point.subscriberY}`),
].join(' ');

const tariffs = [
  {
    id: '290',
    price: '290 ₽',
    title: 'Экономия на меню',
    bestFor: 'Для тех, кто хочет платить меньше уже со следующего заказа.',
    perks: ['-30% на холодные и запеченные роллы', '-20% на сеты', 'доступ к ценам подписчика'],
  },
  {
    id: '490',
    price: '690 ₽',
    title: 'Скидки + подарочный ролл',
    bestFor: 'Для тех, кто заказывает регулярно и хочет получать больше за те же привычки.',
    perks: ['все скидки тарифа 290', 'подарочный ролл каждые 15 дней', 'любой ролл до 620 ₽ на выбор'],
    featured: true,
  },
  {
    id: '1190',
    price: '1 390 ₽',
    title: 'VIP для частых заказов',
    bestFor: 'Для семьи, офиса и тех, кто берет не только роллы, но и сеты.',
    perks: ['подарочный сет каждые 30 дней', 'скидки на роллы и сеты в меню подписки', 'VIP-клуб и кофе к заказу'],
  },
];

const steps = [
  'Выберите тариф и срок подписки: 1, 3 или 5 месяцев, затем оплатите онлайн.',
  'Открывайте меню подписки, где цены уже пересчитаны со скидкой.',
  'Заказывайте дешевле, забирайте подарки в доступные периоды и копите SHC.',
];

const faq = [
  {
    question: 'Когда подписка окупается?',
    answer:
      'Если роллы или сеты появляются в вашем месяце регулярно, подписка быстро начинает работать в плюс: роллы дешевле на 30%, сеты - на 20%.',
  },
  {
    question: 'Можно ли заказать на этом сайте без подписки?',
    answer:
      'Нет. Этот сайт сделан для подписчиков и заказов через меню подписки. Заказ без подписки доступен только в отдельном приложении Суши-Хаус 39.',
  },
  {
    question: 'Что дают подарочные периоды?',
    answer:
      'Это дополнительная выгода поверх скидок. В тарифе 690 ₽ доступен подарочный ролл каждые 15 дней, а в тарифе 1 390 ₽ - подарочный сет каждые 30 дней.',
  },
  {
    question: 'Где работает сервис?',
    answer:
      'Подписка работает для заказов Суши-Хаус 39 в Калининграде с доставкой и самовывозом из доступных точек.',
  },
];

function setMeta(selector, attrs) {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    document.head.appendChild(tag);
  }

  Object.entries(attrs).forEach(([key, value]) => {
    tag.setAttribute(key, value);
  });
}

function setCanonical(url) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function setJsonLd() {
  const scriptId = 'landing-structured-data';
  const previous = document.getElementById(scriptId);
  if (previous) previous.remove();

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Суши-Хаус 39',
        url: SITE_URL,
        logo: `${SITE_URL}/logo512.png`,
        areaServed: 'Калининград',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'Суши-Хаус 39',
        inLanguage: 'ru-RU',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'Service',
        '@id': `${SITE_URL}/#subscription`,
        name: 'Подписка Суши-Хаус 39',
        serviceType: 'Подписка на суши и роллы',
        provider: { '@id': `${SITE_URL}/#organization` },
        areaServed: 'Калининград',
        description: seo.description,
        offers: tariffs.map((tariff) => ({
          '@type': 'Offer',
          name: tariff.title,
          price: tariff.price.replace(/[^\d]/g, ''),
          priceCurrency: 'RUB',
          url: `${SITE_URL}/pay/${tariff.id}`,
          availability: 'https://schema.org/InStock',
        })),
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        mainEntity: faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
  };

  const script = document.createElement('script');
  script.id = scriptId;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(graph);
  document.head.appendChild(script);
}

function LandingPage() {
  const { loading: userLoading, profile, tarif } = useUser();
  const subscriptionStatus = profile?.статусСписания || null;
  const hasActiveSubscription = subscriptionStatus === 'активно';
  const hadSubscription = Boolean(profile && !hasActiveSubscription && (tarif || subscriptionStatus));
  const heroLead = hadSubscription ? expiredHeroLead : defaultHeroLead;
  const navCta = profile
    ? { href: '/profile', label: 'Кабинет' }
    : { href: '/login', label: userLoading ? 'Проверяем' : 'Войти' };
  const primaryCta = hadSubscription
      ? { href: '#tariffs', label: 'Продлить подписку' }
      : { href: '#economy', label: 'Посчитать выгоду' };
  const secondaryCta = hadSubscription
      ? { href: '/profile', label: 'Проверить профиль' }
      : { href: '/discount-shop', label: 'Меню подписки' };

  useEffect(() => {
    document.body.classList.add('shop-body');
    document.title = seo.title;
    setMeta('meta[name="description"]', { name: 'description', content: seo.description });
    setMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow' });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    setMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'ru_RU' });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: seo.title });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: seo.description });
    setMeta('meta[property="og:url"]', { property: 'og:url', content: seo.canonical });
    setMeta('meta[property="og:image"]', { property: 'og:image', content: seo.image });
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: seo.title });
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: seo.description });
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: seo.image });
    setCanonical(seo.canonical);
    setJsonLd();

    const nav = document.querySelector('.landing-nav');
    const onScroll = () => {
      if (!nav) return;
      nav.classList.toggle('landing-nav--scrolled', window.scrollY > 16);
    };

    const revealItems = Array.from(document.querySelectorAll('.landing-reveal'));
    let observer;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('landing-reveal--visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

      revealItems.forEach((item) => observer.observe(item));
    } else {
      revealItems.forEach((item) => item.classList.add('landing-reveal--visible'));
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const hashScrollTimer = window.setTimeout(() => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      document.getElementById(hash)?.scrollIntoView({ block: 'start' });
    }, 80);

    return () => {
      document.body.classList.remove('shop-body');
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(hashScrollTimer);
      if (observer) observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!userLoading && hasActiveSubscription) {
      window.location.replace('/discount-shop');
    }
  }, [userLoading, hasActiveSubscription]);

  const openTariff = (tariffId) => {
    window.location.href = `/pay/${tariffId}`;
  };

  if (!userLoading && hasActiveSubscription) {
    return null;
  }

  return (
    <main className="landing-page">
      <header className="landing-nav" aria-label="Навигация лендинга">
        <a className="landing-nav__brand" href="/" aria-label="Суши-Хаус 39">
          <img src="/logo.jpg" alt="" className="landing-nav__logo" />
          <span>Суши-Хаус 39</span>
        </a>
        <nav className="landing-nav__links" aria-label="Основные разделы">
          <a href="#benefits">Выгоды</a>
          <a href="#economy">Экономия</a>
          <a href="#tariffs">Тарифы</a>
          <a href="#faq">Вопросы</a>
        </nav>
        <a className="landing-nav__login" href={navCta.href}>{navCta.label}</a>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <img className="landing-hero__image" src={HERO_IMAGE} alt="Сет роллов Суши-Хаус 39" />
        <div className="landing-hero__shade" />
        <div className="landing-hero__content">
          <p className="landing-kicker landing-reveal">Суши и роллы по подписке в Калининграде</p>
          <h1 id="landing-title" className="landing-reveal" style={{ '--reveal-delay': '70ms' }}>Суши-Хаус 39</h1>
          <p className="landing-hero__lead landing-reveal" style={{ '--reveal-delay': '140ms' }}>
            {heroLead}
          </p>
          {hadSubscription && (
            <div className="landing-subscriber-note landing-subscriber-note--expired landing-reveal" style={{ '--reveal-delay': '175ms' }}>
              <strong>Подписка не активна</strong>
              {profile?.датаОКОНЧАНИЯ && <span>Закончилась: {profile.датаОКОНЧАНИЯ}</span>}
            </div>
          )}
          <div className="landing-hero__actions landing-reveal" style={{ '--reveal-delay': '210ms' }}>
            <a className="landing-btn landing-btn--primary" href={primaryCta.href}>{primaryCta.label}</a>
            <a className="landing-btn landing-btn--ghost" href={secondaryCta.href}>{secondaryCta.label}</a>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--intro landing-reveal" id="benefits">
        <div className="landing-section__inner">
          <p className="landing-section__eyebrow">Почему подписка выгодна</p>
          <h2>Платите меньше за то, что и так заказываете</h2>
          <div className="landing-value-grid">
            {valuePoints.map((point, index) => (
              <article className="landing-value landing-reveal" key={point.title} style={{ '--reveal-delay': `${index * 80}ms` }}>
                <div className="landing-value__stat">{point.stat}</div>
                <h3>{point.title}</h3>
                <p>{point.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--savings landing-reveal" id="economy" aria-labelledby="savings-title">
        <div className="landing-section__inner landing-savings">
          <div className="landing-reveal">
            <p className="landing-section__eyebrow">Экономика подписки</p>
            <h2 id="savings-title">Чем чаще заказываете, тем быстрее подписка превращается в чистую выгоду</h2>
            <p>
              Скидка применяется не один раз, а на каждый заказ в меню подписки.
              Поэтому выгода растет вместе с вашим обычным ритмом заказов.
            </p>
          </div>
          <div className="landing-savings__visual landing-reveal" style={{ '--reveal-delay': '120ms' }}>
            <figure className="landing-savings-chart" aria-labelledby="savings-chart-title">
              <figcaption>
                <span>Накопленная разница</span>
                <strong id="savings-chart-title">+1 800 ₽ за 4 заказа</strong>
                <small>Пример на роллах со скидкой -30%, без подарков и SHC</small>
              </figcaption>
              <div className="landing-savings-chart__canvas">
                <svg viewBox="0 0 360 206" role="img" aria-label="График сравнения обычной цены и цены с подпиской">
                  <defs>
                    <linearGradient id="landingSavingArea" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(60, 200, 161, 0.42)" />
                      <stop offset="100%" stopColor="rgba(60, 200, 161, 0.05)" />
                    </linearGradient>
                    <filter id="landingSavingGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <g className="landing-savings-chart__grid" aria-hidden="true">
                    <line x1="18" y1="40" x2="342" y2="40" />
                    <line x1="18" y1="80" x2="342" y2="80" />
                    <line x1="18" y1="120" x2="342" y2="120" />
                    <line x1="18" y1="160" x2="342" y2="160" />
                  </g>
                  <polygon className="landing-savings-chart__area" points={savingsArea} />
                  <polyline className="landing-savings-chart__line landing-savings-chart__line--regular" points={regularLine} />
                  <polyline className="landing-savings-chart__line landing-savings-chart__line--subscriber" points={subscriberLine} />
                  {savingsCurve.map((point, index) => (
                    <g className="landing-savings-chart__point" key={point.label} style={{ '--point-delay': `${index * 90}ms` }}>
                      <line x1={point.x} y1={point.regularY} x2={point.x} y2={point.subscriberY} />
                      <circle cx={point.x} cy={point.regularY} r="4" className="landing-savings-chart__dot landing-savings-chart__dot--regular" />
                      <circle cx={point.x} cy={point.subscriberY} r="4" className="landing-savings-chart__dot landing-savings-chart__dot--subscriber" />
                      <text x={point.x} y="194" textAnchor="middle">{point.label}</text>
                    </g>
                  ))}
                </svg>
                <div className="landing-savings-chart__callout">
                  <span>экономия</span>
                  <strong>1 800 ₽</strong>
                </div>
              </div>
              <div className="landing-savings-chart__legend">
                <span><i className="landing-savings-chart__mark landing-savings-chart__mark--regular" />Обычная цена</span>
                <span><i className="landing-savings-chart__mark landing-savings-chart__mark--subscriber" />С подпиской</span>
              </div>
            </figure>
            <div className="landing-savings__table" aria-label="Примеры экономии">
              {savings.map((row, index) => (
                <div className="landing-saving-row" key={row.label} style={{ '--row-index': index }}>
                  <span className="landing-saving-row__label">{row.label}</span>
                  <span className="landing-saving-row__regular" data-label="Обычно">{row.regular}</span>
                  <span className="landing-saving-row__subscriber" data-label="С подпиской">{row.subscriber}</span>
                  <strong data-label="Выгода">{row.profit}</strong>
                </div>
              ))}
              <div className="landing-savings__legend">
                <span>обычная цена</span>
                <span>с подпиской</span>
                <span>выгода</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-reveal" id="tariffs" aria-labelledby="tariffs-title">
        <div className="landing-section__inner">
          <p className="landing-section__eyebrow">Тарифы</p>
          <h2 id="tariffs-title">Выберите тариф под свой ритм заказов</h2>
          <div className="landing-tariffs">
            {tariffs.map((tariff, index) => (
              <article className={`landing-tariff landing-reveal${tariff.featured ? ' landing-tariff--featured' : ''}`} key={tariff.id} style={{ '--reveal-delay': `${index * 90}ms` }}>
                {tariff.featured && <span className="landing-tariff__badge">Чаще всего выбирают</span>}
                <div className="landing-tariff__top">
                  <span>{tariff.price}</span>
                  <small>/ месяц</small>
                </div>
                <h3>{tariff.title}</h3>
                <p>{tariff.bestFor}</p>
                <ul>
                  {tariff.perks.map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>
                <button type="button" onClick={() => openTariff(tariff.id)}>
                  {hadSubscription ? 'Продлить тариф' : 'Подключить тариф'}
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--flow landing-reveal" aria-labelledby="flow-title">
        <div className="landing-section__inner">
          <p className="landing-section__eyebrow">Как это работает</p>
          <h2 id="flow-title">Подписка оформляется на 1, 3 или 5 месяцев, а выгода работает на каждом заказе</h2>
          <ol className="landing-flow">
            {steps.map((step, index) => (
              <li className="landing-reveal" key={step} style={{ '--reveal-delay': `${index * 90}ms` }}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
          <div className="landing-final-cta landing-reveal">
            <h2>Соберите корзину в меню подписки и сразу увидьте цены со скидкой</h2>
            <a className="landing-btn landing-btn--primary" href="#tariffs">Выбрать тариф</a>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--faq landing-reveal" id="faq" aria-labelledby="faq-title">
        <div className="landing-section__inner">
          <p className="landing-section__eyebrow">FAQ</p>
          <h2 id="faq-title">Частые вопросы о подписке</h2>
          <div className="landing-faq">
            {faq.map((item, index) => (
              <article className="landing-reveal" key={item.question} style={{ '--reveal-delay': `${index * 70}ms` }}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}

export default LandingPage;
