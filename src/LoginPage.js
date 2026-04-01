// src/LoginPage.js — Вход в веб-версию: телефон + пароль, сброс через Telegram OTP

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from './UserContext';
import './shop.css';

const WEB_TOKEN_KEY = 'web_token';
const WEB_USER_ID_KEY = 'web_user_id';

function normalizePhone(raw) {
  const nums = String(raw || '').replace(/\D/g, '');
  if (nums.length === 11 && nums.startsWith('8')) return '7' + nums.slice(1);
  if (nums.length === 11 && nums.startsWith('7')) return nums;
  if (nums.length === 10) return '7' + nums;
  return nums;
}

function LoginPage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const { loginByPhone } = useUser();

  // 'phone' | 'password' | 'otp' | 'set-password' | 'name'
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP resend countdown (seconds)
  const [resendIn, setResendIn] = useState(0);
  const timerRef = useRef(null);

  const startResendCountdown = (seconds = 60) => {
    setResendIn(seconds);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendIn(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  // Шаг 1: проверка телефона
  const handleCheckPhone = async (e) => {
    e.preventDefault();
    setError('');
    const normalized = normalizePhone(phone);
    if (!/^7\d{10}$/.test(normalized)) {
      setError('Введите корректный российский номер телефона');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/login-by-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) { setError(data.error || 'Ошибка входа'); return; }

      if (data.hasPassword) {
        // Пароль установлен → вводим пароль
        setPassword('');
        setStep('password');
      } else if (data.requiresOtp) {
        // Telegram-пользователь без пароля → OTP → создать пароль
        setCode('');
        setStep('otp');
        startResendCountdown(60);
      } else if (data.isExistingUser === false) {
        // Новый пользователь → запрашиваем имя
        setStep('name');
      } else {
        // Веб-пользователь без Telegram → JWT уже в ответе
        localStorage.setItem(WEB_TOKEN_KEY, data.token);
        localStorage.setItem(WEB_USER_ID_KEY, data.userId);
        window.location.href = '/';
      }
    } catch {
      setError('Ошибка соединения. Проверьте подключение к интернету.');
    } finally {
      setLoading(false);
    }
  };

  // Шаг 2a: вход по паролю
  const handleLoginPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!password) { setError('Введите пароль'); return; }
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/login-with-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone), password }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) { setError(data.error || 'Неверный пароль'); return; }
      localStorage.setItem(WEB_TOKEN_KEY, data.token);
      localStorage.setItem(WEB_USER_ID_KEY, data.userId);
      window.location.href = '/';
    } catch {
      setError('Ошибка соединения.');
    } finally {
      setLoading(false);
    }
  };

  // "Забыли пароль?" — запрашиваем OTP для сброса
  const handleForgotPassword = async () => {
    setError('');
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/login-by-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone) }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) { setError(data.error || 'Ошибка отправки кода'); return; }
      if (data.requiresOtp) {
        setCode('');
        setStep('otp');
        startResendCountdown(60);
      } else {
        setError('Сброс пароля через Telegram недоступен для этого аккаунта');
      }
    } catch {
      setError('Ошибка соединения.');
    } finally {
      setLoading(false);
    }
  };

  // Шаг 2b: OTP введён → переходим к созданию пароля
  const handleOtpNext = (e) => {
    e.preventDefault();
    setError('');
    if (code.length < 4) { setError('Введите 4-значный код'); return; }
    setPassword('');
    setPasswordConfirm('');
    setStep('set-password');
  };

  // Повторная отправка OTP
  const handleResendOtp = async () => {
    if (resendIn > 0) return;
    setError('');
    setCode('');
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/login-by-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone) }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) { setError(data.error || 'Ошибка отправки'); return; }
      startResendCountdown(60);
    } catch {
      setError('Ошибка соединения.');
    } finally {
      setLoading(false);
    }
  };

  // Шаг 3: установить новый пароль (используем сохранённый code)
  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Пароль должен быть не менее 6 символов'); return; }
    if (password !== passwordConfirm) { setError('Пароли не совпадают'); return; }
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone), code, password }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) { setError(data.error || 'Ошибка сохранения пароля'); return; }
      localStorage.setItem(WEB_TOKEN_KEY, data.token);
      localStorage.setItem(WEB_USER_ID_KEY, data.userId);
      window.location.href = '/';
    } catch {
      setError('Ошибка соединения.');
    } finally {
      setLoading(false);
    }
  };

  // Шаг 4: регистрация нового пользователя
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Введите ваше имя'); return; }
    setLoading(true);
    try {
      await loginByPhone(normalizePhone(phone), name.trim());
    } catch (err) {
      setError(err.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  const subtitle = {
    phone: 'Введите номер телефона для входа',
    password: 'Введите пароль',
    otp: 'Введите код из Telegram',
    'set-password': 'Создайте пароль для входа',
    name: 'Как вас зовут?',
  }[step];

  return (
    <div className="shop-page">
      <div className="shop-payment" style={{ paddingTop: 40 }}>

        {/* Логотип */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/logo.jpg"
            alt="Суши-Хаус 39"
            style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
          <div style={{ marginTop: 12, fontSize: 20, fontWeight: 700, color: '#fff' }}>
            Суши-Хаус 39
          </div>
          <div style={{ marginTop: 4, fontSize: 14, color: '#9fb0c3' }}>{subtitle}</div>
        </div>

        {/* ШАГ 1: Телефон */}
        {step === 'phone' && (
          <form onSubmit={handleCheckPhone}>
            <div className="shop-payment__card" style={{ padding: '20px 16px' }}>
              <div className="shop-form-field" style={{ marginBottom: 0 }}>
                <label className="shop-form-field__label">Номер телефона</label>
                <input
                  className="shop-form-field__input"
                  type="tel"
                  placeholder="+7 (___) ___-__-__"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>
            {error && <div className="shop-payment__error" style={{ marginTop: 12 }}>{error}</div>}
            <button
              type="submit"
              className="shop-payment__btn"
              style={{ marginTop: 16 }}
              disabled={loading || !phone.trim()}
            >
              {loading ? 'Проверяем...' : 'Продолжить'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#9fb0c3', lineHeight: 1.5 }}>
              Если вы оформляли подписку через Telegram — введите тот же номер.
            </div>
          </form>
        )}

        {/* ШАГ 2a: Пароль */}
        {step === 'password' && (
          <form onSubmit={handleLoginPassword}>
            <div className="shop-payment__card" style={{ padding: '20px 16px' }}>
              <div style={{ marginBottom: 14, color: '#9fb0c3', fontSize: 14 }}>
                Номер: <span style={{ color: '#fff', fontWeight: 600 }}>+{normalizePhone(phone)}</span>
              </div>
              <div className="shop-form-field" style={{ marginBottom: 0 }}>
                <label className="shop-form-field__label">Пароль</label>
                <input
                  className="shop-form-field__input"
                  type="password"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>
            {error && <div className="shop-payment__error" style={{ marginTop: 12 }}>{error}</div>}
            <button
              type="submit"
              className="shop-payment__btn"
              style={{ marginTop: 16 }}
              disabled={loading || !password}
            >
              {loading ? 'Входим...' : 'Войти'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#3CC8A1', fontSize: 14, cursor: 'pointer' }}
                onClick={handleForgotPassword}
                disabled={loading}
              >
                Забыли пароль?
              </button>
            </div>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#9fb0c3', fontSize: 13, cursor: 'pointer', display: 'block', margin: '10px auto 0' }}
              onClick={() => { setStep('phone'); setError(''); setPassword(''); }}
            >
              ← Изменить номер
            </button>
          </form>
        )}

        {/* ШАГ 2b: OTP код */}
        {step === 'otp' && (
          <form onSubmit={handleOtpNext}>
            <div className="shop-payment__card" style={{ padding: '20px 16px' }}>
              <div style={{ marginBottom: 14, color: '#9fb0c3', fontSize: 14, lineHeight: 1.5 }}>
                Мы отправили 4-значный код в Telegram на аккаунт, привязанный к номеру{' '}
                <span style={{ color: '#fff', fontWeight: 600 }}>+{normalizePhone(phone)}</span>
              </div>
              <div className="shop-form-field" style={{ marginBottom: 0 }}>
                <label className="shop-form-field__label">Код из Telegram</label>
                <input
                  className="shop-form-field__input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="_ _ _ _"
                  maxLength={4}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  autoFocus
                  disabled={loading}
                  style={{ fontSize: 28, letterSpacing: 8, textAlign: 'center' }}
                />
              </div>
            </div>

            {error && <div className="shop-payment__error" style={{ marginTop: 12 }}>{error}</div>}

            <button
              type="submit"
              className="shop-payment__btn"
              style={{ marginTop: 16 }}
              disabled={loading || code.length < 4}
            >
              Продолжить
            </button>

            {/* Повторная отправка */}
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              {resendIn > 0 ? (
                <span style={{ fontSize: 13, color: '#9fb0c3' }}>
                  Отправить повторно через {resendIn} сек.
                </span>
              ) : (
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#3CC8A1', fontSize: 14, cursor: 'pointer' }}
                  onClick={handleResendOtp}
                  disabled={loading}
                >
                  Отправить код повторно
                </button>
              )}
            </div>

            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#9fb0c3', fontSize: 13, cursor: 'pointer', display: 'block', margin: '10px auto 0' }}
              onClick={() => { setStep('phone'); setError(''); setCode(''); }}
            >
              ← Изменить номер
            </button>
          </form>
        )}

        {/* ШАГ 3: Создать/сменить пароль */}
        {step === 'set-password' && (
          <form onSubmit={handleSetPassword}>
            <div className="shop-payment__card" style={{ padding: '20px 16px' }}>
              <div style={{ marginBottom: 14, color: '#9fb0c3', fontSize: 14 }}>
                Создайте пароль для быстрого входа в следующий раз
              </div>
              <div className="shop-form-field">
                <label className="shop-form-field__label">Новый пароль</label>
                <input
                  className="shop-form-field__input"
                  type="password"
                  placeholder="Минимум 6 символов"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  disabled={loading}
                />
              </div>
              <div className="shop-form-field" style={{ marginBottom: 0 }}>
                <label className="shop-form-field__label">Повторите пароль</label>
                <input
                  className="shop-form-field__input"
                  type="password"
                  placeholder="Повторите пароль"
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            {error && <div className="shop-payment__error" style={{ marginTop: 12 }}>{error}</div>}
            <button
              type="submit"
              className="shop-payment__btn"
              style={{ marginTop: 16 }}
              disabled={loading || password.length < 6 || !passwordConfirm}
            >
              {loading ? 'Сохраняем...' : 'Сохранить и войти'}
            </button>
          </form>
        )}

        {/* ШАГ 4: Имя (новый пользователь) */}
        {step === 'name' && (
          <form onSubmit={handleRegister}>
            <div className="shop-payment__card" style={{ padding: '20px 16px' }}>
              <div style={{ marginBottom: 12, color: '#9fb0c3', fontSize: 14 }}>
                Телефон: <span style={{ color: '#fff' }}>+{normalizePhone(phone)}</span>
              </div>
              <div className="shop-form-field" style={{ marginBottom: 0 }}>
                <label className="shop-form-field__label">Ваше имя</label>
                <input
                  className="shop-form-field__input"
                  type="text"
                  placeholder="Имя"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>
            {error && <div className="shop-payment__error" style={{ marginTop: 12 }}>{error}</div>}
            <button
              type="submit"
              className="shop-payment__btn"
              style={{ marginTop: 16 }}
              disabled={loading || !name.trim()}
            >
              {loading ? 'Входим...' : 'Войти'}
            </button>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#9fb0c3', fontSize: 14, cursor: 'pointer', display: 'block', margin: '12px auto 0' }}
              onClick={() => { setStep('phone'); setError(''); }}
            >
              ← Изменить номер
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
