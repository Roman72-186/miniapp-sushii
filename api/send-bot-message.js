// api/send-bot-message.js — Отправка сообщения пользователю через Telegram Bot API

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { telegram_id, text, reply_markup, delete_message_id } = req.body || {};
  if (!telegram_id || !text) {
    return res.status(400).json({ error: 'telegram_id и text обязательны' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('send-bot-message: TELEGRAM_BOT_TOKEN not configured');
    return res.status(500).json({ error: 'Bot not configured' });
  }

  try {
    // Удалить предыдущее сообщение, если передан ID
    if (delete_message_id) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: telegram_id, message_id: Number(delete_message_id) }),
        });
      } catch (e) {
        console.error('send-bot-message: deleteMessage failed:', e.message);
      }
    }

    const body = {
      chat_id: telegram_id,
      text,
      parse_mode: 'HTML',
    };
    if (reply_markup) {
      body.reply_markup = reply_markup;
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!data.ok) {
      console.error('send-bot-message: Telegram API error:', data.description);
      return res.status(200).json({ success: false, error: data.description });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('send-bot-message error:', error.message);
    return res.status(500).json({ error: 'Ошибка отправки сообщения' });
  }
};
