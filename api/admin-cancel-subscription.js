// Отмена будущих списаний администратором с сохранением оплаченного доступа.
const { checkAuth } = require('./_lib/admin-auth');
const { getUser, cancelAutoRenew } = require('./_lib/db');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });
  if (!checkAuth(req, res)) return;

  const id = req.body?.telegram_id;
  // Поддерживаем строковые web_* и legacy ID; запрещаем пути к чужим файлам.
  if (!['string', 'number'].includes(typeof id) || !/^[A-Za-z0-9_-]{1,128}$/.test(String(id))) {
    return res.status(400).json({ error: 'Некорректный идентификатор пользователя' });
  }

  try {
    const user = await getUser(String(id));
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    // Идемпотентная операция: не меняет тариф, даты, подарки и баланс.
    await cancelAutoRenew(String(id));
    try {
      fs.unlinkSync(path.join(__dirname, '..', 'data', 'users', `${id}.json`));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return res.status(200).json({
      success: true,
      auto_renew_disabled: true,
      has_payment_method: false,
      message: 'Автопродление отключено. Оплаченный срок подписки сохранён.',
    });
  } catch (_) {
    // Не выводим личные данные или идентификаторы платёжных методов в журнал.
    console.error('[admin-cancel-subscription] Не удалось завершить отмену автопродления');
    return res.status(500).json({ error: 'Не удалось завершить отмену автопродления. Повторите попытку.' });
  }
};
