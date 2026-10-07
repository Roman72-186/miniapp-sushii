const { checkAuth } = require('./_lib/admin-auth');
const { getUser } = require('./_lib/db');

// Контакты читаются из актуального профиля, а не сохраняются в журнале.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Метод не поддерживается' });
  if (!checkAuth(req, res)) return;

  const id = String(req.query?.id || '');
  if (!id || id.length > 150) return res.status(400).json({ error: 'Некорректный ID пользователя' });

  try {
    const user = await getUser(id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    const fields = [
      'telegram_id', 'name', 'first_name', 'last_name', 'middle_name', 'phone', 'email',
      'tariff', 'subscription_status', 'subscription_start', 'subscription_end',
      'balance_shc', 'partner_code', 'invited_by', 'notes', 'last_address',
      'last_pickup_point', 'is_ambassador', 'created_at', 'updated_at',
    ];
    const profile = Object.fromEntries(fields.map(field => [field, user[field] ?? null]));
    profile.has_payment_method = Boolean(user.payment_method_id);
    profile.auto_renew_disabled = Boolean(user.auto_renew_disabled);
    return res.json({ success: true, user: profile });
  } catch (error) {
    console.error('[admin-audit-user] Ошибка чтения профиля:', error.message);
    return res.status(500).json({ error: 'Ошибка чтения профиля' });
  }
};
