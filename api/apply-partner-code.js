// api/apply-partner-code.js — Применение партнёрского кода после покупки подписки

const { getUser, getPartnerByCode, setInvitedBy, updateBalance, processReferralBonus, getDb } = require('./_lib/db');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { telegram_id, code } = req.body || {};

  if (!telegram_id || !code) {
    return res.status(400).json({ error: 'telegram_id и code обязательны' });
  }

  const cleanCode = String(code).trim().toUpperCase();
  if (cleanCode.length < 4 || cleanCode.length > 8) {
    return res.status(400).json({ error: 'Некорректный код' });
  }

  try {
    // Ищем партнёра по коду
    const partner = getPartnerByCode(cleanCode);
    if (!partner) {
      return res.status(404).json({ error: 'Код не найден. Проверьте правильность ввода.' });
    }

    // Нельзя использовать собственный код
    if (String(partner.telegram_id) === String(telegram_id)) {
      return res.status(400).json({ error: 'Нельзя использовать собственный код' });
    }

    // Проверяем, не установлен ли уже invited_by
    const user = getUser(telegram_id);
    if (user?.invited_by) {
      return res.status(400).json({ error: 'Код партнёра уже был применён ранее' });
    }

    // Устанавливаем реферальную связь
    setInvitedBy(String(telegram_id), String(partner.telegram_id));

    // Ретроактивная комиссия 20% за последний платёж
    const db = getDb();
    const lastPayment = db.prepare(
      'SELECT * FROM payments WHERE telegram_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(String(telegram_id));

    let shcAwarded = 0;
    if (lastPayment && lastPayment.amount > 0) {
      shcAwarded = Math.round(lastPayment.amount * 0.20);
      updateBalance(String(partner.telegram_id), shcAwarded);
    }

    // Пороговые SHC бонусы (50 SHC за друга + бонусы за количество)
    processReferralBonus(String(partner.telegram_id), String(telegram_id));

    // Очищаем кэш обоих пользователей
    for (const tid of [telegram_id, partner.telegram_id]) {
      try {
        const cachePath = path.join(__dirname, '..', 'data', 'users', `${tid}.json`);
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      } catch {}
    }

    console.log('[apply-partner-code] Код применён:', {
      user: telegram_id,
      partner: partner.telegram_id,
      code: cleanCode,
      shc_awarded: shcAwarded,
    });

    return res.status(200).json({
      success: true,
      partner_name: partner.name || 'Партнёр',
      shc_awarded: shcAwarded,
    });
  } catch (error) {
    console.error('[apply-partner-code] Ошибка:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
