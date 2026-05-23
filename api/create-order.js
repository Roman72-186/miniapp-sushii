// api/create-order.js - создание заказа (SQLite phone lookup + Frontpad + Telegram)

const { createOrder } = require('./_lib/frontpad');
const { readUserCache } = require('./_lib/user-cache');
const { getUser, updateBalance, insertOrder } = require('./_lib/db');
const { geocode } = require('./_lib/geocoder');
const { findNearestStore } = require('./_lib/nearest-store');
const { deriveFromDbUser } = require('./_lib/subscription-state');
const { readGiftRules } = require('./_lib/gift-rules');

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

module.exports = async (req, res) => {
  const allowedOrigins = ['https://sushi-house-39.ru', 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

    const isPickup = delivery_type === 'pickup';

    let orderPhone = client.phone || '';
    console.log(`[ORDER] phone_from_form="${client.phone}"`);

    if (telegram_id) {
      const cache = await readUserCache(telegram_id);
      const cachedPhone = cache?.listItem?.telefon;

      if (cachedPhone) {
        console.log(`[ORDER] phone_from_cache="${cachedPhone}" (overrides form)`);
        orderPhone = cachedPhone;
      } else {
        const dbUser = await getUser(telegram_id);
        if (dbUser?.phone) {
          console.log(`[ORDER] phone_from_db="${dbUser.phone}" (overrides form)`);
          orderPhone = dbUser.phone;
        }
      }
    }

    console.log(`[ORDER] final_phone="${orderPhone}"`);

    // Серверная нормализация и валидация телефона
    orderPhone = normalizePhone(orderPhone);
    console.log(`[ORDER] normalized_phone="${orderPhone}"`);

    if (!orderPhone) {
      return res.status(400).json({ success: false, error: 'Не удалось определить телефон' });
    }

    if (!/^7\d{10}$/.test(orderPhone)) {
      return res.status(400).json({ success: false, error: 'Некорректный номер телефона. Формат: +7XXXXXXXXXX' });
    }

    let orderAffiliate = affiliate || '';
    console.log(
      `[ORDER] type=${delivery_type}, affiliate_from_frontend="${affiliate}", pickup_point_id="${pickup_point_id || ''}", street="${client.street || ''}"`
    );

    if (!isPickup) {
      if (orderAffiliate) {
        console.log(`[ORDER] Using frontend affiliate: ${orderAffiliate}`);
      } else if (client.street) {
        try {
          const addr = [client.street, client.home].filter(Boolean).join(', ');
          console.log(`[ORDER] Geocoding address: "${addr}"`);
          const geo = await geocode(addr);
          if (geo) {
            console.log(`[ORDER] Geocoded: lat=${geo.lat}, lon=${geo.lon}, formatted="${geo.formatted}"`);
            const nearest = findNearestStore(geo.lat, geo.lon);
            if (nearest) {
              orderAffiliate = nearest.affiliate;
              console.log(`[ORDER] Nearest store: ${nearest.name} (${nearest.distanceText}), affiliate=${nearest.affiliate}`);
            }
          } else {
            console.log(`[ORDER] Geocode returned null for "${addr}"`);
          }
        } catch (geoErr) {
          console.error('[ORDER] Geocode error:', geoErr.message);
        }
      } else {
        console.log('[ORDER] No street provided, skipping geocode');
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

    const orderTotal = products.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 1), 0);

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
      products: products.map(product => ({
        id: product.frontpad_id || product.frontpadId || product.sku || product.product_id || product.id,
        quantity: product.quantity,
        price: product.price,
      })),
      client: orderClient,
      payment: payment || 'cash',
      affiliate: orderAffiliate,
      datetime: datetime || '',
      comment: orderComment,
      ...frontpadDiscount,
    });

    if (!orderResult.success) {
      return res.status(500).json({
        success: false,
        error: orderResult.error?.message || 'Ошибка создания заказа в Frontpad',
      });
    }

    if (shcToUse > 0 && telegram_id) {
      await updateBalance(telegram_id, -shcToUse);
    }

    // Сохраняем заказ в БД
    if (telegram_id) {
      try {
        const isPickupOrder = isPickup || delivery_type === 'pickup';
        const orderAddress = isPickupOrder
          ? (body.pickup_point_address || client.street || null)
          : ([client.street, client.home].filter(Boolean).join(', ') || null);
        const productsList = products.map(p => ({
          sku: p.sku || p.frontpad_id || p.frontpadId || p.product_id || p.id,
          name: p.name || String(p.id),
          qty: p.quantity || 1,
          price: p.price || 0,
          giftSource: p.gift_source || undefined,
        }));
        const rawPromo = String(body.promo_code || '').trim();
        const promoCode = /^[A-Za-z0-9]{1,20}$/.test(rawPromo) ? rawPromo : null;
        const hasPromoGift = products.some(p => String(p.gift_source || '').startsWith('promo'));
        const hasThresholdGift = products.some(p => {
          const source = String(p.gift_source || '');
          return source === 'threshold2500' || source.startsWith('threshold');
        });
        const giftSources = buildGiftSources(products, promoCode);
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
