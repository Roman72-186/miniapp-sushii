import { pushEcommerce, reachGoal, YM_GOALS } from './metrika';

function productId(product) {
  return String(product?.sku || product?.frontpadId || product?.frontpad_id || product?.id || '');
}

function productName(product) {
  return String(product?.cleanName || product?.name || productId(product) || 'Товар');
}

function toMetrikaProduct(product, quantity = 1) {
  return {
    id: productId(product),
    name: productName(product),
    price: Number(product?.price) || 0,
    quantity: Math.max(1, Number(quantity) || 1),
    category: product?.category || undefined,
  };
}

export function trackAddToCart(product, quantity = 1) {
  if (!product || product.gift) return;

  const item = toMetrikaProduct(product, quantity);
  reachGoal(YM_GOALS.CART_ADD, {
    value: item.price * item.quantity,
    items_count: item.quantity,
    product_id: item.id,
    category: item.category,
  });

  pushEcommerce({
    ecommerce: {
      currencyCode: 'RUB',
      add: {
        products: [item],
      },
    },
  });
}

export function trackPurchase({ orderId, items, total, orderType = 'discount' }) {
  const products = (items || [])
    .filter(item => item?.product && !item.product.gift)
    .map(item => toMetrikaProduct(item.product, item.quantity));

  reachGoal(YM_GOALS.ORDER_CREATED, {
    value: Number(total) || 0,
    items_count: products.reduce((sum, item) => sum + item.quantity, 0),
    order_type: orderType,
  });

  if (products.length === 0) return;

  pushEcommerce({
    ecommerce: {
      currencyCode: 'RUB',
      purchase: {
        actionField: {
          id: String(orderId || `order_${Date.now()}`),
          revenue: Number(total) || 0,
        },
        products,
      },
    },
  });
}
