// api/auth/_email-sender.js — Отправка OTP через Resend.com

const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendOtpViaEmail(email, code) {
  if (!RESEND_API_KEY) {
    console.error('[email-sender] Отсутствует RESEND_API_KEY');
    return false;
  }
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Суши-Хаус 39 <noreply@sushi-house-39.ru>',
        to: email,
        subject: `Код входа: ${code}`,
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px;background:#1a1a1a;border-radius:16px;color:#fff;">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="font-size:22px;font-weight:700;">Суши-Хаус 39</div>
            </div>
            <p style="color:#9fb0c3;margin-bottom:8px;">Ваш код для входа:</p>
            <div style="text-align:center;font-size:48px;font-weight:700;letter-spacing:12px;color:#3CC8A1;margin:24px 0;">
              ${code}
            </div>
            <p style="color:#9fb0c3;font-size:13px;text-align:center;">Код действителен 5 минут. Никому не сообщайте его.</p>
          </div>
        `,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error('[email-sender] Ошибка Resend:', JSON.stringify(data));
      return false;
    }
    console.log('[email-sender] Email отправлен:', email, '| id:', data.id);
    return true;
  } catch (err) {
    console.error('[email-sender] Исключение:', err.message);
    return false;
  }
}

module.exports = { sendOtpViaEmail };
