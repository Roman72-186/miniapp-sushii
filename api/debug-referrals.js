// api/debug-referrals.js — Временный: найти пользователей с рефералами
// УДАЛИТЬ ПОСЛЕ ТЕСТИРОВАНИЯ

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiToken = process.env.WATBOT_API_TOKEN;
  if (!apiToken) {
    return res.status(500).json({ error: 'No token' });
  }

  const base = `https://watbot.ru/api/v1/getContacts?api_token=${apiToken}&bot_id=72975&count=500`;

  try {
    // Берём первую страницу контактов
    const firstRes = await fetch(`${base}&page=1`, {
      headers: { 'Accept': 'application/json' },
    });
    const firstData = await firstRes.json();
    const contacts = firstData.data || [];

    // Проверяем рефералов для первых 20 контактов (чтобы не перегружать)
    const results = [];

    // Также загружаем страницы 2-3 для большего покрытия
    for (let p = 2; p <= 3; p++) {
      try {
        const pageRes = await fetch(`${base}&page=${p}`, { headers: { 'Accept': 'application/json' } });
        const pageData = await pageRes.json();
        if (pageData.data) contacts.push(...pageData.data);
      } catch (e) {}
    }

    for (const c of contacts.slice(0, 100)) {
      try {
        const refRes = await fetch(
          `https://watbot.ru/api/v1/getReferrals?api_token=${apiToken}&bot_id=72975&contact_id=${c.id}`,
          { headers: { 'Accept': 'application/json' } }
        );
        const refData = await refRes.json();
        const refList = Array.isArray(refData.data) ? refData.data : (Array.isArray(refData) ? refData : []);

        if (refList.length > 0) {
          results.push({
            name: c.name,
            telegram_id: c.telegram_id,
            watbot_id: c.id,
            referrals_count: refList.length,
            referrals: refList.slice(0, 5).map(r => r.name || 'Без имени'),
          });
        }
      } catch (e) {
        // skip
      }
    }

    return res.status(200).json({
      checked: Math.min(contacts.length, 100),
      total_contacts: firstData.meta?.total || contacts.length,
      users_with_referrals: results,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
