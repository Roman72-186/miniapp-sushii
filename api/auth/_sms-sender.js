// api/auth/_sms-sender.js — Отправка SMS через smsc.ru

const SMSC_LOGIN = process.env.SMSC_LOGIN;
const SMSC_PASSWORD = process.env.SMSC_PASSWORD;

async function sendOtpViaSms(phone, code) {
  if (!SMSC_LOGIN || !SMSC_PASSWORD) {
    console.error('[sms-sender] Отсутствуют SMSC_LOGIN или SMSC_PASSWORD');
    return false;
  }
  try {
    const params = new URLSearchParams({
      login: SMSC_LOGIN,
      psw: SMSC_PASSWORD,
      phones: phone,
      mes: `Ваш код входа Суши-Хаус 39: ${code}. Никому не сообщайте.`,
      fmt: '3',
      charset: 'utf-8',
    });
    const resp = await fetch('https://smsc.ru/sys/send.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await resp.json();
    if (data.error_code) {
      console.error('[sms-sender] Ошибка smsc.ru:', data.error, '(код', data.error_code + ')');
      return false;
    }
    console.log('[sms-sender] SMS отправлена на', phone, '| id:', data.id);
    return true;
  } catch (err) {
    console.error('[sms-sender] Исключение:', err.message);
    return false;
  }
}

module.exports = { sendOtpViaSms };
