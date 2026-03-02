// api/get-profile.js — Получение профиля подписчика через WATBOT API (с кэшем)
// Vercel Serverless Function (CommonJS)

const { readUserCache } = require('./_lib/user-cache');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const { telegram_id } = req.body || {};

  if (!telegram_id) {
    return res.status(400).json({ error: 'telegram_id обязателен' });
  }

  try {
    // 1. Попытка из кэша
    const cache = await readUserCache(telegram_id);
    if (cache && cache.contact) {
      const v = cache.variables || {};
      return res.status(200).json({
        name: cache.contact.name || null,
        phone: v['phone'] || v['телефон'] || (cache.listItem && cache.listItem.telefon) || null,
        статусСписания: v['статусСписания'] || null,
        balance_shc: v['balance_shc'] || null,
        датаОКОНЧАНИЯ: v['датаОКОНЧАНИЯ'] || null,
        датаНачала: v['датаНачала'] || null,
        датаПодарка: v['датаПодарка'] || null,
        contact_id: cache.contact.id || null,
        ref_url: v['ref_url'] || null,
        has_payment_id: !!v['PaymentID'],
      });
    }

    // 2. Fallback: WATBOT API
    const apiToken = process.env.WATBOT_API_TOKEN;
    if (!apiToken) {
      return res.status(500).json({ error: 'Ошибка конфигурации сервера' });
    }

    const tgId = String(telegram_id);
    const base = `https://watbot.ru/api/v1/getContacts?api_token=${apiToken}&bot_id=72975&count=500`;

    const firstRes = await fetch(`${base}&page=1`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!firstRes.ok) {
      return res.status(502).json({ error: 'Ошибка запроса к WATBOT API' });
    }

    const firstData = await firstRes.json();
    const lastPage = firstData.meta?.last_page || 1;

    let contact = (firstData.data || []).find(c => c.telegram_id === tgId);

    if (!contact && lastPage > 1) {
      const pageNums = [];
      for (let p = 2; p <= lastPage; p++) pageNums.push(p);

      const results = await Promise.all(
        pageNums.map(p =>
          fetch(`${base}&page=${p}`, { headers: { 'Accept': 'application/json' } })
            .then(r => r.json())
            .then(data => (data.data || []).find(c => c.telegram_id === tgId) || null)
            .catch(() => null)
        )
      );

      contact = results.find(c => c !== null) || null;
    }

    if (!contact) {
      return res.status(404).json({ error: 'Контакт не найден' });
    }

    const contactName = contact.name || null;
    const variables = contact.variables || [];
    let статусСписания = null;
    let balance_shc = null;
    let датаОКОНЧАНИЯ = null;
    let датаНачала = null;
    let датаПодарка = null;
    let phone = null;
    let телефон = null;
    let ref_url = null;
    let paymentId = null;

    for (const v of variables) {
      const name = v.name || '';
      const value = v.value != null ? String(v.value) : '';
      if (name === 'статусСписания') статусСписания = value;
      if (name === 'balance_shc') balance_shc = value;
      if (name === 'датаОКОНЧАНИЯ') датаОКОНЧАНИЯ = value;
      if (name === 'датаНачала') датаНачала = value;
      if (name === 'датаПодарка') датаПодарка = value;
      if (name === 'phone') phone = value;
      if (name === 'телефон') телефон = value;
      if (name === 'ref_url') ref_url = value;
      if (name === 'PaymentID') paymentId = value;
    }

    return res.status(200).json({
      name: contactName,
      phone: phone || телефон || null,
      статусСписания,
      balance_shc,
      датаОКОНЧАНИЯ,
      датаНачала,
      датаПодарка,
      contact_id: contact.id || null,
      ref_url,
      has_payment_id: !!paymentId,
    });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
