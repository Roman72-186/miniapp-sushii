const { checkAuth } = require('../_lib/admin-auth');
const {
  normalizeCode,
  normalizeRule,
  readGiftRules,
  writeGiftRules,
  findProductBySku,
  getEnrichedGiftRules,
  makeId,
} = require('../_lib/gift-rules');

function sendRules(res) {
  const enriched = getEnrichedGiftRules({ activeOnly: false });
  return res.status(200).json({
    success: true,
    ...enriched,
    promoSkus: enriched.promoRules.filter(rule => rule.enabled).map(rule => String(rule.sku)),
    thresholdSkus: enriched.thresholdRules.filter(rule => rule.enabled).map(rule => String(rule.sku)),
  });
}

function validatePayload(body, type, existingId = null) {
  const sku = String(body.sku || '').trim();
  const threshold = Math.round(Number(body.threshold) || 0);
  const enabled = body.enabled !== false;
  if (!sku) return { error: 'SKU обязателен' };
  if (!findProductBySku(sku)) return { error: 'Товар с таким SKU не найден или выключен' };
  if (!threshold || threshold < 1) return { error: 'Порог суммы должен быть больше 0' };

  const payload = {
    id: existingId || makeId(type),
    type,
    threshold,
    sku,
    enabled,
    createdAt: body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (type === 'promo') {
    const code = normalizeCode(body.code);
    if (!code) return { error: 'Промокод обязателен' };
    if (!/^[A-Z0-9_-]{2,30}$/.test(code)) {
      return { error: 'Промокод: 2-30 символов, латиница/цифры/_/-' };
    }
    payload.code = code;
  }

  const normalized = normalizeRule(payload, type);
  if (!normalized) return { error: 'Некорректное правило' };
  return { rule: normalized };
}

const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  try {
    if (req.method === 'GET') return sendRules(res);

    const rules = readGiftRules();
    const body = req.body || {};
    const type = body.type === 'threshold' ? 'threshold' : 'promo';
    const listKey = type === 'promo' ? 'promoRules' : 'thresholdRules';

    if (req.method === 'POST') {
      const { rule, error } = validatePayload(body, type);
      if (error) return res.status(400).json({ error });

      if (type === 'promo' && rules.promoRules.some(item => item.enabled && item.code === rule.code)) {
        return res.status(400).json({ error: 'Активный промокод с таким кодом уже есть' });
      }

      rules[listKey] = [...rules[listKey], rule];
      writeGiftRules(rules);
      return sendRules(res);
    }

    if (req.method === 'PUT') {
      const id = String(body.id || '');
      if (!id) return res.status(400).json({ error: 'id обязателен' });
      const index = rules[listKey].findIndex(rule => String(rule.id) === id);
      if (index === -1) return res.status(404).json({ error: 'Правило не найдено' });

      const current = rules[listKey][index];
      const { rule, error } = validatePayload({ ...current, ...body, createdAt: current.createdAt }, type, id);
      if (error) return res.status(400).json({ error });

      if (type === 'promo' && rule.enabled && rules.promoRules.some(item => item.id !== id && item.enabled && item.code === rule.code)) {
        return res.status(400).json({ error: 'Активный промокод с таким кодом уже есть' });
      }

      rules[listKey][index] = rule;
      writeGiftRules(rules);
      return sendRules(res);
    }

    if (req.method === 'DELETE') {
      const id = String(body.id || '');
      if (!id) return res.status(400).json({ error: 'id обязателен' });
      const nextPromo = rules.promoRules.filter(rule => String(rule.id) !== id);
      const nextThreshold = rules.thresholdRules.filter(rule => String(rule.id) !== id);
      if (nextPromo.length === rules.promoRules.length && nextThreshold.length === rules.thresholdRules.length) {
        return res.status(404).json({ error: 'Правило не найдено' });
      }
      writeGiftRules({ promoRules: nextPromo, thresholdRules: nextThreshold });
      return sendRules(res);
    }

    return res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (error) {
    console.error('admin gift-rules error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

module.exports = handler;
