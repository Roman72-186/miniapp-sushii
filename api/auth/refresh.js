// api/auth/refresh.js — Обновление JWT токена

const jwt = require('jsonwebtoken');
const { supabase } = require('../_lib/supabase');
const { generateToken, generateRefreshToken, JWT_SECRET } = require('../_lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { refreshToken } = req.body || {};

  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken обязателен' });
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET + '_refresh');
    
    // Ищем пользователя в Supabase
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', payload.userId)
      .single();

    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    return res.status(200).json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (e) {
    console.error('[auth/refresh] Ошибка:', e.message);
    return res.status(401).json({ error: 'Неверный refresh токен' });
  }
};
