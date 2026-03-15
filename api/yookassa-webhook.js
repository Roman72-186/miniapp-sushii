// api/yookassa-webhook.js — Обработка webhook от YooKassa (payment.succeeded)
// Vercel Serverless Function (CommonJS)

const { readUserCache, writeUserCache } = require('./_lib/user-cache');
const { frontpadRequest } = require('./_lib/frontpad');
const { getUser, upsertUser, recordPayment, processCommissions } = require('./_lib/db');

const WATBOT_BASE = 'https://watbot.ru/api/v1';

// ID подписок во Frontpad
const TARIF_PRODUCT_ID = {
  '290': '1177',
  '490': '1050',
  '1190': '1178',
  '9990': '1215',
};

// YooKassa IP ranges (для проверки подлинности)
const YOOKASSA_CIDRS = ['185.71.76.', '185.71.77.'];

/**
 * Находит контакт по telegram_id (пагинация getContacts)
 */
async function findContact(apiToken, telegramId) {
  const tgId = String(telegramId);
  const base = `${WATBOT_BASE}/getContacts?api_token=${apiToken}&bot_id=72975&count=500`;

  const firstRes = await fetch(`${base}&page=1`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!firstRes.ok) throw new Error('WATBOT getContacts error: ' + firstRes.status);

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

  return contact;
}

/**
 * Устанавливает переменную контакта в WATBOT
 */
async function setVariable(apiToken, contactId, name, value) {
  await fetch(`${WATBOT_BASE}/setContactVariable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      api_token: apiToken,
      bot_id: 72975,
      contact_id: Number(contactId),
      name,
      value: String(value),
    }),
  });
}

/**
 * Добавляет тег контакту в WATBOT
 */
async function addTag(apiToken, contactId, tagName) {
  await fetch(`${WATBOT_BASE}/addContactTag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      api_token: apiToken,
      bot_id: 72975,
      contact_id: Number(contactId),
      tag: tagName,
    }),
  });
}

/**
 * Форматирует дату в DD.MM.YYYY
 */
function formatDate(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

/**
 * Верифицирует платёж через YooKassa API (fallback если IP проверка не прошла)
 */
async function verifyPayment(paymentId) {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) return null;

  const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
  const res = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
    headers: { 'Authorization': `Basic ${auth}` },
  });
  if (!res.ok) return null;
  return await res.json();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = req.body || {};
    const event = body.event;

    // Только payment.succeeded
    if (event !== 'payment.succeeded') {
      return res.status(200).json({ status: 'ignored', event });
    }

    const payment = body.object || {};
    const paymentMethodId = payment.payment_method?.id;
    const telegramId = payment.metadata?.telegram_id;
    const tarif = payment.metadata?.tarif;
    const months = Number(payment.metadata?.months) || 1;

    if (!telegramId || !tarif) {
      console.error('webhook: missing metadata', { telegramId, tarif });
      return res.status(200).json({ status: 'ignored', reason: 'no metadata' });
    }

    // Проверка IP отправителя
    const forwardedFor = req.headers['x-forwarded-for'] || '';
    const clientIp = forwardedFor.split(',')[0].trim();
    const isYooKassaIp = YOOKASSA_CIDRS.some(cidr => clientIp.startsWith(cidr));

    // Если IP не из диапазона YooKassa — верифицируем платёж через API
    if (!isYooKassaIp) {
      const verified = await verifyPayment(payment.id);
      if (!verified || verified.status !== 'succeeded') {
        console.error('webhook: payment verification failed', { paymentId: payment.id, clientIp });
        return res.status(403).json({ error: 'Payment verification failed' });
      }
    }

    const apiToken = process.env.WATBOT_API_TOKEN;
    const isOneTime = String(tarif) === '9990';
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30 * months);

    // 1. WATBOT: синхронизация тегов/переменных (необязательно — если WATBOT недоступен, ничего страшного)
    try {
      if (apiToken) {
        const contact = await findContact(apiToken, telegramId);
        if (contact && contact.id) {
          const contactId = contact.id;
          if (isOneTime) {
            await addTag(apiToken, contactId, 'Амба');
          } else {
            await Promise.all([
              setVariable(apiToken, contactId, 'статусСписания', 'активно'),
              setVariable(apiToken, contactId, 'датаНачала', formatDate(now)),
              setVariable(apiToken, contactId, 'датаОКОНЧАНИЯ', formatDate(endDate)),
            ]);
            await Promise.all([
              addTag(apiToken, contactId, String(tarif)),
              addTag(apiToken, contactId, 'подписка30'),
            ]);
          }
          console.log('webhook: WATBOT synced for', telegramId);
        } else {
          console.warn('webhook: WATBOT contact not found for', telegramId, '— skipping WATBOT sync');
        }
      }
    } catch (watbotErr) {
      console.warn('webhook: WATBOT sync failed (non-fatal):', watbotErr.message);
    }

    // 2. Читаем кэш + SQLite для телефона
    let cached = null;
    try { cached = await readUserCache(telegramId); } catch (_) {}

    const dbUser = getUser(telegramId);

    // 3. Создать заказ во Frontpad для учёта подписки
    try {
      let phone = cached?.listItem?.telefon || cached?.variables?.phone || dbUser?.phone || null;

      if (!phone && apiToken) {
        try {
          const listRes = await fetch('https://watbot.ru/api/v1/getListItems?api_token=' + apiToken, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
              schema_id: '69a16dc23dd8ee76a202a802',
              filters: { id_tg: String(telegramId) },
            }),
          });
          if (listRes.ok) {
            const listData = await listRes.json();
            const item = (listData.data || [])[0];
            if (item) phone = item.telefon || item.phone || null;
          }
        } catch (_) {}
      }

      const productId = TARIF_PRODUCT_ID[String(tarif)];
      const monthsLabel = months === 1 ? '1 мес' : `${months} мес`;

      if (productId && phone) {
        const normalizedPhone = phone.replace(/[^\d]/g, '');
        const fullPhone = normalizedPhone.startsWith('7') ? normalizedPhone : '7' + normalizedPhone;

        const fpResult = await frontpadRequest('new_order', {
          'product[0]': productId,
          'product_kol[0]': '1',
          'product_price[0]': '1',
          'hook_status[0]': '10',
          name: 'Подписка',
          phone: fullPhone,
          sale: '100',
          descr: `Подписка за ${tarif} срок ${monthsLabel}`,
        });

        if (fpResult.success) {
          console.log('webhook: frontpad order created', fpResult.data);
        } else {
          console.error('webhook: frontpad order failed', fpResult.error);
        }
      } else {
        console.warn('webhook: skipped frontpad order', { productId, hasPhone: !!phone });
      }
    } catch (fpErr) {
      console.error('webhook: frontpad error', fpErr.message);
    }

    // 6. SQLite: записываем платёж + начисляем комиссии
    try {
      const paymentAmount = Number(payment.amount?.value) || 0;

      // Обновляем пользователя в SQLite
      upsertUser({
        telegram_id: String(telegramId),
        tariff: String(tarif),
        is_ambassador: isOneTime ? true : undefined,
        subscription_status: isOneTime ? undefined : 'активно',
        subscription_start: isOneTime ? undefined : formatDate(now),
        subscription_end: isOneTime ? undefined : formatDate(endDate),
        payment_method_id: isOneTime ? undefined : (paymentMethodId || undefined),
      });

      // Записываем платёж
      const paymentDbId = recordPayment({
        telegram_id: String(telegramId),
        tariff: String(tarif),
        amount: paymentAmount,
        months,
        yookassa_payment_id: payment.id || null,
      });

      // Начисляем комиссии амбассадорам (если плательщик — чей-то реферал)
      if (!isOneTime && paymentAmount > 0) {
        const commissions = processCommissions(String(telegramId), paymentAmount, paymentDbId);
        if (commissions.length > 0) {
          console.log('webhook: commissions processed', commissions);
        }
      }
    } catch (dbErr) {
      console.error('webhook: SQLite error:', dbErr.message);
      // Не фатально — основная логика уже выполнена
    }

    // 7. Инвалидировать кэш — обновить данные
    try {
      const updatedTags = cached?.tags ? [...cached.tags] : [];
      if (isOneTime) {
        if (!updatedTags.includes('Амба')) updatedTags.push('Амба');
      } else {
        if (!updatedTags.includes(String(tarif))) updatedTags.push(String(tarif));
        if (!updatedTags.includes('подписка30')) updatedTags.push('подписка30');
      }

      // Определяем тариф из тегов (Амба = 9990, далее 1190 > 490 > 290)
      let resolvedTarif = null;
      if (updatedTags.includes('Амба')) resolvedTarif = '9990';
      else if (updatedTags.includes('1190')) resolvedTarif = '1190';
      else if (updatedTags.includes('490')) resolvedTarif = '490';
      else if (updatedTags.includes('290')) resolvedTarif = '290';

      const updatedVariables = { ...(cached?.variables || {}) };
      if (!isOneTime) {
        updatedVariables['статусСписания'] = 'активно';
        updatedVariables['датаНачала'] = formatDate(now);
        updatedVariables['датаОКОНЧАНИЯ'] = formatDate(endDate);
      }

      await writeUserCache(telegramId, {
        ...(cached || {}),
        telegram_id: String(telegramId),
        syncedAt: new Date().toISOString(),
        tags: updatedTags,
        tarif: resolvedTarif,
        variables: updatedVariables,
      });
    } catch (cacheErr) {
      console.error('webhook: cache update failed', cacheErr.message);
      // Не фатально — кэш обновится при следующем sync
    }

    console.log('webhook: payment processed', { telegramId, tarif, months, paymentMethodId: !!paymentMethodId });
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('webhook error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
};
