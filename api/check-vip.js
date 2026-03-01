// api/check-vip.js — Проверка подписки на VIP-группу и генерация одноразовой ссылки
// Vercel Serverless Function (CommonJS)

const VIP_CHAT_ID = -1002685881613;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { telegram_id } = req.body || {};
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: 'Ошибка конфигурации сервера' });

  const tgApi = `https://api.telegram.org/bot${botToken}`;

  try {
    // 1. Проверяем, состоит ли пользователь в группе
    const memberRes = await fetch(
      `${tgApi}/getChatMember?chat_id=${VIP_CHAT_ID}&user_id=${telegram_id}`
    );
    const memberData = await memberRes.json();

    if (memberData.ok) {
      const status = memberData.result?.status;
      // member, administrator, creator — уже в группе
      if (['member', 'administrator', 'creator'].includes(status)) {
        // Получаем ссылку на группу для перехода
        let chatLink = null;
        try {
          const chatRes = await fetch(`${tgApi}/getChat?chat_id=${VIP_CHAT_ID}`);
          const chatData = await chatRes.json();
          if (chatData.ok && chatData.result.invite_link) {
            chatLink = chatData.result.invite_link;
          }
        } catch (e) {}
        return res.status(200).json({ is_member: true, chat_link: chatLink });
      }
    }

    // 2. Не в группе — создаём одноразовую ссылку
    const linkRes = await fetch(`${tgApi}/createChatInviteLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: VIP_CHAT_ID,
        member_limit: 1,
        name: `VIP invite for ${telegram_id}`,
      }),
    });
    const linkData = await linkRes.json();

    if (!linkData.ok) {
      console.error('createChatInviteLink error:', linkData);
      return res.status(502).json({ error: 'Не удалось создать ссылку' });
    }

    return res.status(200).json({
      is_member: false,
      invite_link: linkData.result.invite_link,
    });
  } catch (error) {
    console.error('Ошибка check-vip:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
