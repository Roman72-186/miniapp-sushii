// api/auth/login.js — Вход через email/пароль

const bcrypt = require('bcrypt');
const { supabase } = require('../_lib/supabase');
const { generateToken, generateRefreshToken } = require('../_lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  try {
    // Ищем пользователя по email в Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      console.log('[auth/login] Пользователь не найден:', email);
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ 
        error: 'Аккаунт не имеет пароля. Войдите через Telegram или восстановите пароль.' 
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    console.log('[auth/login] Успешный вход:', {
      telegram_id: user.telegram_id,
      email: user.email,
      name: user.name,
    });

    return res.status(200).json({
      success: true,
      userId: user.telegram_id,
      email: user.email,
      name: user.name,
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('[auth/login] Ошибка:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
