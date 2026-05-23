function parseJson(value, fallback) {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function normalizeSourceEntry(entry, row) {
  if (!entry || typeof entry !== 'object') return null;
  const source = String(entry.source || entry.giftSource || '').trim();
  if (!source) return null;
  const type = entry.type || (source.startsWith('promo') ? 'promo' : source.startsWith('threshold') ? 'threshold' : '');
  if (type !== 'promo' && type !== 'threshold') return null;
  return {
    type,
    source,
    ruleId: entry.ruleId || (source.includes(':') ? source.split(':').slice(1).join(':') : ''),
    code: type === 'promo' ? String(entry.code || row.promo_code || '').trim().toUpperCase() : '',
    threshold: Number(entry.threshold) || (source === 'threshold2500' ? 2500 : 0),
    sku: String(entry.sku || entry.id || '').trim(),
    name: String(entry.name || '').trim(),
    qty: Math.max(1, Math.round(Number(entry.qty || entry.quantity || 1) || 1)),
  };
}

function getGiftEntries(row) {
  const explicit = parseJson(row.gift_sources_json, []);
  if (explicit.length > 0) {
    return explicit.map(entry => normalizeSourceEntry(entry, row)).filter(Boolean);
  }

  return parseJson(row.products_json, [])
    .map(product => normalizeSourceEntry({
      source: product.giftSource,
      sku: product.sku || product.id,
      name: product.name,
      qty: product.qty || product.quantity,
    }, row))
    .filter(Boolean);
}

function addGiftStat(bucket, entry) {
  const giftKey = entry.sku || entry.name || 'unknown';
  const existing = bucket.giftsMap.get(giftKey) || {
    sku: entry.sku,
    name: entry.name || entry.sku || 'Подарок',
    uses: 0,
  };
  existing.uses += entry.qty;
  bucket.giftsMap.set(giftKey, existing);
  bucket.uses += entry.qty;
}

function finalizeBucket(bucket) {
  return {
    ...bucket,
    gifts: Array.from(bucket.giftsMap.values()).sort((a, b) => b.uses - a.uses),
    giftsMap: undefined,
  };
}

function summarizeGiftUsage(rows) {
  const promoMap = new Map();
  const thresholdMap = new Map();

  for (const row of rows || []) {
    for (const entry of getGiftEntries(row)) {
      if (entry.type === 'promo') {
        const code = entry.code || 'БЕЗ КОДА';
        const key = `${code}|${entry.source}`;
        const bucket = promoMap.get(key) || {
          code,
          source: entry.source,
          ruleId: entry.ruleId,
          uses: 0,
          giftsMap: new Map(),
        };
        addGiftStat(bucket, entry);
        promoMap.set(key, bucket);
      }

      if (entry.type === 'threshold') {
        const key = `${entry.threshold || 0}|${entry.source}`;
        const bucket = thresholdMap.get(key) || {
          threshold: entry.threshold || null,
          source: entry.source,
          ruleId: entry.ruleId,
          uses: 0,
          giftsMap: new Map(),
        };
        addGiftStat(bucket, entry);
        thresholdMap.set(key, bucket);
      }
    }
  }

  return {
    promoCodes: Array.from(promoMap.values()).map(finalizeBucket).sort((a, b) => b.uses - a.uses),
    thresholdGifts: Array.from(thresholdMap.values()).map(finalizeBucket).sort((a, b) => b.uses - a.uses),
  };
}

module.exports = {
  summarizeGiftUsage,
};
