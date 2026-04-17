// api/_lib/email-notifications.js — отправка уведомлений через Resend.com
// Переиспользует паттерн api/auth/_email-sender.js

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.APP_URL || 'https://sushi-house-39.ru';
const FROM = 'Суши-Хаус 39 <noreply@sushi-house-39.ru>';

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.error('[email-notifications] Отсутствует RESEND_API_KEY');
    return false;
  }
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error('[email-notifications] Resend error:', JSON.stringify(data));
      return false;
    }
    console.log('[email-notifications] sent:', to, '| subject:', subject, '| id:', data.id);
    return true;
  } catch (err) {
    console.error('[email-notifications] Exception:', err.message);
    return false;
  }
}

function giftAvailableHtml({ firstName, giftType, windowStart, windowEnd }) {
  const label = giftType === 'set' ? 'сет' : 'ролл';
  const emoji = giftType === 'set' ? '🍱' : '🍣';
  const hello = firstName ? `Привет, ${escapeHtml(firstName)}!` : 'Привет!';
  return `
    <div style="font-family:sans-serif;max-width:440px;margin:0 auto;padding:32px;background:#1a1a1a;border-radius:16px;color:#fff;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:22px;font-weight:700;">Суши-Хаус 39</div>
      </div>
      <p style="color:#9fb0c3;margin-bottom:8px;">${hello}</p>
      <div style="text-align:center;font-size:56px;margin:20px 0;">${emoji}🎁</div>
      <p style="color:#fff;font-size:18px;font-weight:600;text-align:center;margin:0 0 8px;">
        Твой подарочный ${label} уже доступен!
      </p>
      <p style="color:#9fb0c3;text-align:center;margin:12px 0 24px;">
        Период: <strong style="color:#eaeaf8;">${escapeHtml(windowStart)} — ${escapeHtml(windowEnd)}</strong><br>
        Успей получить до окончания периода.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${APP_URL}/discount-shop" style="display:inline-block;background:#3CC8A1;color:#000;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;">
          Получить подарок
        </a>
      </div>
      <p style="color:#6f7d92;font-size:12px;text-align:center;margin-top:24px;">Суши-Хаус 39 · ${APP_URL}</p>
    </div>
  `;
}

function renewalReminderHtml({ firstName, tariff, endDate }) {
  const hello = firstName ? `Привет, ${escapeHtml(firstName)}!` : 'Привет!';
  return `
    <div style="font-family:sans-serif;max-width:440px;margin:0 auto;padding:32px;background:#1a1a1a;border-radius:16px;color:#fff;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:22px;font-weight:700;">Суши-Хаус 39</div>
      </div>
      <p style="color:#9fb0c3;margin-bottom:8px;">${hello}</p>
      <p style="color:#fff;font-size:17px;font-weight:600;margin:16px 0 8px;">
        Завтра спишется оплата подписки
      </p>
      <p style="color:#9fb0c3;margin:0 0 16px;">
        ${escapeHtml(endDate)} произойдёт автоматическое продление вашего тарифа <strong style="color:#eaeaf8;">${escapeHtml(String(tariff))} ₽</strong>.
      </p>
      <p style="color:#9fb0c3;margin:0 0 24px;">
        Пожалуйста, убедитесь, что на привязанной карте достаточно средств.
        Если продлевать подписку не нужно — отмените автосписание заранее.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${APP_URL}/settings" style="display:inline-block;background:#e85c5c;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;margin:0 6px 10px;">
          Отменить автосписание
        </a>
        <a href="${APP_URL}/profile" style="display:inline-block;background:#3CC8A1;color:#000;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;margin:0 6px 10px;">
          Личный кабинет
        </a>
      </div>
      <p style="color:#6f7d92;font-size:12px;text-align:center;margin-top:24px;">Суши-Хаус 39 · ${APP_URL}</p>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendGiftAvailableEmail(email, firstName, giftType, windowObj) {
  if (!email) return false;
  const label = giftType === 'set' ? 'сет' : 'ролл';
  return sendEmail({
    to: email,
    subject: `🎁 Твой подарочный ${label} уже доступен`,
    html: giftAvailableHtml({
      firstName,
      giftType,
      windowStart: windowObj.start,
      windowEnd: windowObj.end,
    }),
  });
}

async function sendRenewalReminderEmail(email, firstName, tariff, endDate) {
  if (!email) return false;
  return sendEmail({
    to: email,
    subject: 'Завтра спишется оплата подписки Суши-Хаус 39',
    html: renewalReminderHtml({ firstName, tariff, endDate }),
  });
}

module.exports = { sendGiftAvailableEmail, sendRenewalReminderEmail };
