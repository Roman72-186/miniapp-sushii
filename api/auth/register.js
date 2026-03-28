// api/auth/register.js — Регистрация через email/пароль

const bcrypt = require('bcrypt');
const { supabase } = require('../_lib/supabase');
const { generateToken, generateRefreshToken } = require('../_lib/auth');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { email, password, name, phone, referral_code } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  // Валидация email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Некорректный email' });
  }

  // Валидация пароля
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
  }

  try {
    // Проверяем существование пользователя с таким email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Хэшируем пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Генерируем реферальный код
    const myReferralCode = uuidv4().slice(0, 8);

    // Генерируем telegram_id для веб-пользователя
    const telegramId = 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Создаём пользователя
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramId,
        email,
        password_hash: passwordHash,
        name: name || null,
        phone: phone || null,
        referral_code: myReferralCode,
        auth_method: 'web',
      })
      .select()
      .single();

    if (error) {
      console.error('[auth/register] Ошибка создания пользователя:', error);
      return res.status(500).json({ error: 'Ошибка при создании пользователя' });
    }

    // Если есть referral_code, привязываем к пригласившему
    if (referral_code) {
      const { data: inviter } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', referral_code)
        .single();

      if (inviter) {
        // Устанавливаем invited_by
        await supabase
          .from('users')
          .update({ invited_by: inviter.id })
          .eq('telegram_id', telegramId)
          .is('invited_by', null);
      }
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    console.log('[auth/register] Успешная регистрация:', {
      telegram_id: user.telegram_id,
      email: user.email,
    });

    return res.status(201).json({
      success: true,
      userId: user.telegram_id,
      email: user.email,
      name: user.name,
      referral_code: myReferralCode,
      referral_url: `https://sushi-house-39.ru/?ref=${myReferralCode}`,
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('[auth/register] Ошибка:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
