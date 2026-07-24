// api/create-order.js - создание заказа (SQLite phone lookup + Frontpad + Telegram)

const { createOrder } = require('./_lib/frontpad');
const { readUserCache } = require('./_lib/user-cache');
const { getUser, updateBalance, insertOrder } = require('./_lib/db');
const { geocode } = require('./_lib/geocoder');
const { findStoreForDelivery } = require('./_lib/nearest-store');
const { deriveFromDbUser } = require('./_lib/subscription-state');
const { readGiftRules } = require('./_lib/gift-rules');
const { appendEligibleOrderGifts } = require('./_lib/order-gifts');
const { validateSubscriptionGifts } = require('./_lib/subscription-gift-access');
const { getAuthenticatedUserId } = require('./_lib/auth');

function parseJsonBody(req) {
  try {
    if (!req.body) return {};
    if (typeof req.body === 'string') return JSON.parse(req.body);
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8'));
    if (typeof req.body === 'object') return req.body;
    return {};
  } catch (error) {
    return {};
  }
}

function normalizePhone(raw) {
  const nums = String(raw || '').replace(/\D/g, '');
  if (nums.length === 11 && nums.startsWith('8')) return '7' + nums.slice(1);
  if (nums.length === 11 && nums.startsWith('7')) return nums;
  if (nums.length === 10) return '7' + nums;
  return nums;
}
// Маскирование PII для логов: полный телефон/адрес не должны попадать в
// открытый текст логов (journalctl, агрегаторы) — оставляем только то,
// что достаточно для отладки маршрутизации, без раскрытия личных данных.
function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 4 ? `***${digits.slice(-4)}` : '***';
}
function maskAddress(value) {
  const str = String(value || '').trim();
  return str ? `${str.slice(0, 3)}***(${str.length})` : '';
}

function sanitizePickupComment(comment) {
  return String(comment || '')
    .split(' | ')
    .filter(part => {
      if (!part) return false;
      return !part.startsWith('Самовывоз:') && !part.startsWith('[pickup_point_address:');
    })
    .join(' | ');
}

function buildGiftSources(products, promoCode) {
  const rules = readGiftRules();
  const promoById = new Map((rules.promoRules || []).map(rule => [String(rule.id), rule]));
  const thresholdById = new Map((rules.thresholdRules || []).map(rule => [String(rule.id), rule]));

  return products
    .map(product => {
      const source = String(product.gift_source || '').trim();
      if (!source.startsWith('promo') && !source.startsWith('threshold')) return null;
      const type = source.startsWith('promo') ? 'promo' : 'threshold';
      const ruleId = source.includes(':') ? source.split(':').slice(1).join(':') : '';
      const rule = type === 'promo' ? promoById.get(ruleId) : thresholdById.get(ruleId);
      return {
        type,
        source,
        ruleId,
        code: type === 'promo' ? String(rule?.code || promoCode || '').trim().toUpperCase() : undefined,
        threshold: Number(rule?.threshold) || (source === 'threshold2500' ? 2500 : undefined),
        sku: String(product.sku || product.frontpad_id || product.frontpadId || product.product_id || product.id || '').trim(),
        name: product.name || String(product.id || ''),
        qty: Math.max(1, Math.round(Number(product.quantity) || 1)),
      };
    })
    .filter(Boolean);
}

function sanitizeAttribution(input) {
  const allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'landing_path', 'saved_at'];
  if (!input || typeof input !== 'object') return null;

  const result = {};
  allowed.forEach(key => {
    const value = String(input[key] || '').trim().slice(0, 300);
    if (value) result[key] = value;
  });

  return Object.keys(result).length ? result : null;
}

module.exports = async (req, res) => {
  const allowedOrigins = ['https://sushi-house-39.ru', 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { isShopOpenServer } = require('./_lib/time-utils');
    if (!isShopOpenServer()) {
      return res.status(400).json({
        success: false,
        error: 'Приём заказов закрыт. Заказы принимаются ежедневно с 10:00 до 21:50 (Калининград)',
      });
    }

    const body = parseJsonBody(req);
    const {
      products,
      client,
      payment,
      comment,
      delivery_type,
      affiliate,
      datetime,
      telegram_id,
      pickup_point_id,
      shc_used,
    } = body;

    // telegram_id опционален (гостевой заказ без подписки), но если он заявлен,
    // должен быть подтверждён собственным JWT — иначе можно оформить заказ,
    // списать чужие SHC-баллы или подделать историю заказов от имени другого юзера.
    if (telegram_id) {
      const authedUserId = getAuthenticatedUserId(req);
      if (!authedUserId || String(authedUserId) !== String(telegram_id)) {
        return res.status(401).json({ success: false, error: 'Требуется авторизация' });
      }
    }

    if (!products || !products.length) {
      return res.status(400).json({ success: false, error: 'Корзина пуста' });
    }

    if (!client || !client.name) {
      return res.status(400).json({ success: false, error: 'Укажите имя' });
    }

    if ((body.order_type || 'discount') === 'discount') {
      if (!telegram_id) {
        return res.status(401).json({ success: false, error: 'Для оформления заказа нужна активная подписка' });
      }

      const orderUser = await getUser(telegram_id);
      const subscription = deriveFromDbUser(orderUser);
      if (subscription.subscriptionStatus !== 'активно') {
        return res.status(403).json({ success: false, error: 'Для оформления заказа нужна активная подписка' });
      }
    }

    if ((body.order_type || 'discount') === 'discount') {
      const orderUser = await getUser(telegram_id);
      const giftAccess = validateSubscriptionGifts(products, orderUser);
      if (!giftAccess.ok) {
        return res.status(403).json({ success: false, error: giftAccess.error });
      }
    }

    const isPickup = delivery_type === 'pickup';

    let orderPhone = client.phone || '';
    console.log(`[ORDER] phone_from_form=${maskPhone(client.phone)}`);

    if (telegram_id) {
      const cache = await readUserCache(telegram_id);
      const cachedPhone = cache?.listItem?.telefon;

      if (cachedPhone) {
        console.log(`[ORDER] phone_from_cache=${maskPhone(cachedPhone)} (overrides form)`);
        orderPhone = cachedPhone;
      } else {
        const dbUser = await getUser(telegram_id);
        if (dbUser?.phone) {
          console.log(`[ORDER] phone_from_db=${maskPhone(dbUser.phone)} (overrides form)`);
          orderPhone = dbUser.phone;
        }
      }
    }

    console.log(`[ORDER] final_phone=${maskPhone(orderPhone)}`);

    // Серверная нормализация и валидация телефона
    orderPhone = normalizePhone(orderPhone);
    console.log(`[ORDER] normalized_phone=${maskPhone(orderPhone)}`);

    if (!orderPhone) {
      return res.status(400).json({ success: false, error: 'Не удалось определить телефон' });
    }

    if (!/^7\d{10}$/.test(orderPhone)) {
      return res.status(400).json({ success: false, error: 'Некорректный номер телефона. Формат: +7XXXXXXXXXX' });
    }

    // Для доставки affiliate из браузера не используется: в UI может успеть
    // остаться результат геокодирования от предыдущего адреса.
    let orderAffiliate = isPickup ? (affiliate || '') : '';
    console.log(
      `[ORDER] type=${delivery_type}, affiliate_from_frontend="${affiliate}", pickup_point_id="${pickup_point_id || ''}", street=${maskAddress(client.street)}`
    );

    if (!isPickup) {
      if (client.street) {
        try {
          const addr = [client.street, client.home].filter(Boolean).join(', ');
          console.log(`[ORDER] Geocoding address: ${maskAddress(addr)}`);
          const geo = await geocode(addr);
          if (!geo) {
            console.log(`[ORDER] Geocode returned null for ${maskAddress(addr)}`);
            return res.status(400).json({
              success: false,
              error: 'Не удалось определить зону доставки. Проверьте адрес или выберите улицу из подсказок.'
            });
          }

          console.log(`[ORDER] Geocoded: lat=${geo.lat}, lon=${geo.lon}, formatted=${maskAddress(geo.formatted)}`);
          const nearest = findStoreForDelivery(addr, geo.lat, geo.lon, undefined, geo.formatted);
          if (!nearest) {
            return res.status(500).json({ success: false, error: 'Не удалось определить филиал для доставки' });
          }

          orderAffiliate = nearest.affiliate;
          console.log(`[ORDER] Nearest store: ${nearest.name} (${nearest.distanceText}), affiliate=${nearest.affiliate}`);
        } catch (geoErr) {
          console.error('[ORDER] Geocode error:', geoErr.message);
          return res.status(502).json({
            success: false,
            error: 'Не удалось определить зону доставки. Попробуйте оформить заказ ещё раз.'
          });
        }
      } else {
        return res.status(400).json({ success: false, error: 'Укажите адрес доставки' });
      }
    }

    console.log(`[ORDER] Final affiliate: "${orderAffiliate}"`);

    const orderClient = isPickup
      ? {
          name: client.name,
          phone: orderPhone,
          street: '',
          home: '',
          apart: '',
          pod: '',
          et: '',
        }
      : {
          name: client.name,
          phone: orderPhone,
          street: client.street || '',
          home: client.home || '',
          apart: client.apart || '',
          pod: client.pod || '',
          et: client.et || '',
        };

    const rawPromo = String(body.promo_code || '').trim();
    const promoCode = /^[A-Za-z0-9]{1,20}$/.test(rawPromo) ? rawPromo : null;
    const attribution = sanitizeAttribution(body.attribution);
    const orderProducts = appendEligibleOrderGifts(products, promoCode);
    const orderTotal = orderProducts.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 1), 0);

    // Списание SHC баллов
    const shcToUse = Number(shc_used) || 0;
    if (shcToUse > 0) {
      if (!telegram_id) {
        return res.status(400).json({ success: false, error: 'Для списания SHC нужно войти в аккаунт' });
      }
      const dbUser = await getUser(telegram_id);
      const userBalance = dbUser?.balance_shc || 0;
      if (userBalance < 3000) {
        return res.status(400).json({ success: false, error: 'Минимум 3000 SHC для списания' });
      }
      if (shcToUse > userBalance) {
        return res.status(400).json({ success: false, error: 'Недостаточно SHC баллов' });
      }
      if (shcToUse > orderTotal) {
        return res.status(400).json({ success: false, error: 'SHC скидка не может быть больше суммы заказа' });
      }

      // Атомарно резервируем баллы ДО создания заказа во Frontpad. Проверка
      // баланса выше (SELECT) и списание разнесены во времени — до этого места
      // два параллельных запроса (двойной клик, повтор) могли оба пройти
      // проверку с одним и тем же балансом и оба списать, уведя баланс в минус
      // и создав два реальных заказа со скидкой. updateBalance теперь атомарна
      // (UPDATE ... WHERE balance_shc + ? >= 0) и возвращает false, если баланс
      // уже занят конкурентным запросом — тогда останавливаемся здесь, раньше
      // вызова Frontpad.
      const reserved = await updateBalance(telegram_id, -shcToUse);
      if (!reserved) {
        return res.status(400).json({ success: false, error: 'Недостаточно SHC баллов' });
      }
    }

    const frontpadDiscount = shcToUse > 0
      ? (shcToUse >= orderTotal
        ? { discountPercent: 100 }
        : { discountAmount: Math.round(shcToUse) })
      : {};

    const orderComment = [
      isPickup ? sanitizePickupComment(comment) : (comment || ''),
      shcToUse > 0 ? `SHC скидка: -${shcToUse}₽` : '',
      pickup_point_id ? `[pickup_point_id:${pickup_point_id}]` : '',
      isPickup ? '[Самовывоз]' : '[Доставка]',
      payment === 'card' ? '[Оплата картой]' : '[Оплата наличными]',
    ].filter(Boolean).join(' | ');

    const orderResult = await createOrder({
      products: orderProducts.map(product => ({
        id: product.frontpad_id || product.frontpadId || product.sku || product.product_id || product.id,
        quantity: product.quantity,
        price: product.price,
      })),
      client: orderClient,
      payment: payment || 'cash',
      affiliate: orderAffiliate,
      datetime: datetime || '',
      comment: orderComment,
      promoCode,
      ...frontpadDiscount,
    });

    if (!orderResult.success) {
      // Заказ во Frontpad не создался — возвращаем зарезервированные баллы.
      if (shcToUse > 0 && telegram_id) {
        await updateBalance(telegram_id, shcToUse);
      }
      console.warn('[ORDER] Frontpad rejected:', JSON.stringify({
        code: orderResult.error?.code || 'UNKNOWN',
        product_ids: orderProducts
          .map(product => String(product.frontpad_id || product.frontpadId || product.sku || product.product_id || product.id || ''))
          .filter(Boolean)
          .slice(0, 50),
        affiliate: orderAffiliate || '',
        delivery_type: isPickup ? 'pickup' : 'delivery',
      }));
      return res.status(500).json({
        success: false,
        error: orderResult.error?.message || 'Ошибка создания заказа в Frontpad',
      });
    }

    if (orderResult.data?.warnings) {
      console.warn('[ORDER] Frontpad warnings:', JSON.stringify(orderResult.data.warnings));
    }

    // Сохраняем заказ в БД
    if (telegram_id) {
      try {
        const isPickupOrder = isPickup || delivery_type === 'pickup';
        const orderAddress = isPickupOrder
          ? (body.pickup_point_address || client.street || null)
          : ([client.street, client.home].filter(Boolean).join(', ') || null);
        const productsList = orderProducts.map(p => ({
          sku: p.sku || p.frontpad_id || p.frontpadId || p.product_id || p.id,
          name: p.name || String(p.id),
          qty: p.quantity || 1,
          price: p.price || 0,
          giftSource: p.gift_source || undefined,
        }));
        const hasPromoGift = orderProducts.some(p => String(p.gift_source || '').startsWith('promo'));
        const hasThresholdGift = orderProducts.some(p => {
          const source = String(p.gift_source || '');
          return source === 'threshold2500' || source.startsWith('threshold');
        });
        const giftSources = buildGiftSources(orderProducts, promoCode);
        await insertOrder({
          telegramId: telegram_id,
          frontpadOrderId: String(orderResult.data.orderId || ''),
          frontpadOrderNumber: String(orderResult.data.orderNumber || ''),
          orderType: body.order_type || 'discount',
          deliveryType: isPickupOrder ? 'pickup' : 'delivery',
          address: orderAddress,
          productsJson: JSON.stringify(productsList),
          totalPrice: Math.round(orderTotal - shcToUse),
          clientName: client.name || null,
          promoCode,
          hasPromoGift,
          hasThresholdGift,
          giftSourcesJson: JSON.stringify(giftSources),
          attributionJson: attribution ? JSON.stringify(attribution) : null,
        });
      } catch (saveErr) {
        console.error('[ORDER] Ошибка сохранения в БД:', saveErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      orderId: orderResult.data.orderId,
      orderNumber: orderResult.data.orderNumber,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({
      success: false,
      error: 'Не удалось создать заказ',
    });
  }
};
