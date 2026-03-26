// api/admin-user-tags.js — Управление тегами пользователя в локальной SQLite
const { checkAuth } = require('./_lib/admin-auth');
const { getUser, adminApplyUserTagAction } = require('./_lib/db');
const { deleteUserCache } = require('./_lib/user-cache');
const { deriveFromDbUser } = require('./_lib/subscription-state');

function buildTags(user) {
  const tags = [];
  if (user?.tariff) tags.push(String(user.tariff));
  if (user?.is_ambassador) tags.push('амба');
  return tags;
}

function serializeUser(user) {
  if (!user) return null;
  const derived = deriveFromDbUser(user);
  return {
    telegram_id: user.telegram_id,
    name: user.name || null,
    phone: user.phone || null,
    tariff: user.tariff || null,
    is_ambassador: !!user.is_ambassador,
    subscription_status: derived.subscriptionStatus,
    auto_renew_status: derived.autoRenewStatus,
    subscription_start: user.subscription_start || null,
    subscription_end: user.subscription_end || null,
    payment_method_id: user.payment_method_id || null,
    tags: buildTags(user),
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  try {
    if (req.method === 'GET') {
      const telegramId = String(req.query?.telegram_id || '').trim();
      if (!telegramId) {
        return res.status(400).json({ error: 'telegram_id обязателен' });
      }

      const user = getUser(telegramId);
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      return res.status(200).json({ success: true, user: serializeUser(user) });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Метод не поддерживается' });
    }

    const telegramId = String(req.body?.telegram_id || '').trim();
    const action = String(req.body?.action || '').trim();
    const tag = String(req.body?.tag || '').trim();

    if (!telegramId || !action || !tag) {
      return res.status(400).json({ error: 'telegram_id, action и tag обязательны' });
    }

    let updatedUser;
    try {
      updatedUser = adminApplyUserTagAction(telegramId, action, tag);
    } catch (error) {
      if (error.message === 'user_not_found') {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      if (error.message === 'invalid_action' || error.message === 'invalid_tag') {
        return res.status(400).json({ error: 'Некорректное действие или тег' });
      }
      throw error;
    }

    await deleteUserCache(telegramId);

    return res.status(200).json({
      success: true,
      user: serializeUser(updatedUser),
    });
  } catch (error) {
    console.error('admin-user-tags error:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
