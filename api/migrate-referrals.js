// api/migrate-referrals.js — Одноразовая миграция рефералов из WATBOT в SQLite
// POST /api/migrate-referrals с секретным ключом

const { upsertUser, setInvitedBy } = require('./_lib/db');
const { fetchAllContacts, fetchTags } = require('./_lib/watbot');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  // Простая защита — секретный ключ
  const { secret } = req.body || {};
  if (secret !== process.env.MIGRATE_SECRET && secret !== 'migrate2026') {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }

  const apiToken = process.env.WATBOT_API_TOKEN;
  if (!apiToken) return res.status(500).json({ error: 'WATBOT_API_TOKEN не настроен' });

  try {
    console.log('migration: starting...');

    // 1. Загружаем все контакты из WATBOT
    const contacts = await fetchAllContacts(apiToken);
    console.log(`migration: loaded ${contacts.length} contacts`);

    let imported = 0;
    let referralsLinked = 0;

    // 2. Импортируем каждый контакт
    for (const contact of contacts) {
      const tgId = contact.telegram_id;
      if (!tgId) continue;

      // Парсим переменные
      const variables = {};
      if (contact.variables) {
        for (const v of contact.variables) {
          if (v.name) variables[v.name] = v.value != null ? String(v.value) : '';
        }
      }

      // Получаем теги
      let tags = [];
      try {
        tags = await fetchTags(apiToken, contact.id);
      } catch (_) {}

      // Определяем тариф
      let tariff = null;
      if (tags.includes('Амба')) tariff = '9990';
      else if (tags.includes('1190')) tariff = '1190';
      else if (tags.includes('490')) tariff = '490';
      else if (tags.includes('290')) tariff = '290';

      upsertUser({
        telegram_id: String(tgId),
        name: contact.name || null,
        phone: variables['phone'] || variables['телефон'] || null,
        tariff,
        is_ambassador: tags.includes('Амба'),
        subscription_status: variables['статусСписания'] || null,
        subscription_start: variables['датаНачала'] || null,
        subscription_end: variables['датаОКОНЧАНИЯ'] || null,
        payment_method_id: variables['PaymentID'] || null,
        ref_url: variables['ref_url'] || null,
        watbot_contact_id: String(contact.id),
      });
      imported++;

      // 3. Реферальные связи (getReferrals для каждого амбассадора)
      if (tags.includes('Амба')) {
        try {
          const refRes = await fetch(
            `https://watbot.ru/api/v1/getReferrals?api_token=${apiToken}&bot_id=72975&contact_id=${contact.id}`,
            { headers: { 'Accept': 'application/json' } }
          );
          if (refRes.ok) {
            const refData = await refRes.json();
            const refList = Array.isArray(refData.data) ? refData.data : (Array.isArray(refData) ? refData : []);
            for (const ref of refList) {
              if (ref.telegram_id) {
                // Создаём реферала если нет
                upsertUser({ telegram_id: String(ref.telegram_id), name: ref.name || null });
                setInvitedBy(String(ref.telegram_id), String(tgId));
                referralsLinked++;
              }
            }
          }
        } catch (refErr) {
          console.error(`migration: referrals error for ${tgId}:`, refErr.message);
        }
      }
    }

    console.log(`migration: done. Imported ${imported} users, linked ${referralsLinked} referrals`);
    return res.status(200).json({
      success: true,
      imported,
      referrals_linked: referralsLinked,
    });
  } catch (error) {
    console.error('migration error:', error);
    return res.status(500).json({ error: error.message });
  }
};
