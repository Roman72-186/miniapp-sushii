// api/gift-items.js — публичный GET: активные правила подарков для корзины

const { getEnrichedGiftRules } = require('./_lib/gift-rules');

const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Метод не поддерживается' });

  try {
    const { promoRules, thresholdRules } = getEnrichedGiftRules({ activeOnly: true });
    const promoSkus = promoRules.map(rule => String(rule.sku));
    const thresholdSkus = thresholdRules.map(rule => String(rule.sku));

    return res.status(200).json({
      success: true,
      promoRules,
      thresholdRules,
      promoGifts: promoRules.map(rule => rule.product).filter(Boolean),
      thresholdGifts: thresholdRules.map(rule => rule.product).filter(Boolean),
      promoSkus,
      thresholdSkus,
    });
  } catch (error) {
    console.error('gift-items error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

module.exports = handler;
