import React, { useEffect, useRef, useState } from 'react';
import { normalizePhone } from './utils/phone';
import { saveWebAuth } from './utils/webAuth';
import { reachGoal, reachGoalOnce, YM_GOALS } from './analytics/metrika';
import './shop.css';

function CompleteRegistrationPage() {
  const params = new URLSearchParams(window.location.search);
  const telegramId = params.get('telegram_id');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState('email');
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => {
      document.body.classList.remove('shop-body');
      clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!telegramId || profile?.статусСписания !== 'активно') return;
    reachGoalOnce(`payment_success_${telegramId}`, YM_GOALS.PAYMENT_SUCCESS, {
      source: 'complete_registration',
    }, 'local');
    reachGoalOnce(`subscription_success_${telegramId}`, YM_GOALS.SUBSCRIPTION_PURCHASE_SUCCESS, {
      source: 'complete_registration',
    }, 'local');
  }, [telegramId, profile]);

  useEffect(() => {
    if (!telegramId) {
      setError('Не найден пользователь для завершения регистрации');
      setLoading(false);
      return;
    }

    fetch('/api/get-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: telegramId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error || !data.phone) {
          throw new Error(data.error || 'Не удалось получить телефон');
        }
        setProfile(data);
      })
      .catch(err => setError(err.message || 'Не удалось загрузить данные регистрации'))
      .finally(() => setLoading(false));
  }, [telegramId]);

  const startResendCountdown = (seconds = 60) => {
    setResendIn(seconds);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendIn(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const phone = normalizePhone(profile?.phone || '');

  const handleSendEmail = async (event) => {
    event.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Введите корректный email');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Не удалось отправить код');
      setCode('');
      setOtpToken('');
      setStep('otp');
      startResendCountdown(60);
    } catch (err) {
      setError(err.message || 'Ошибка отправки кода');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError('');
    if (code.length < 4) {
      setError('Введите код из письма');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/verify-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Неверный код');
      reachGoal(YM_GOALS.EMAIL_OTP_SUCCESS);
      setOtpToken(data.otpToken);
      setPassword('');
      setPasswordConfirm('');
      setStep('password');
    } catch (err) {
      setError(err.message || 'Ошибка проверки кода');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPassword = async (event) => {
    event.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Пароли не совпадают');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          otpToken,
          password,
          name: profile?.name || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Не удалось сохранить пароль');

      saveWebAuth(data);
      reachGoal(YM_GOALS.PASSWORD_SET_SUCCESS);
      reachGoal(YM_GOALS.AUTH_PHONE_SUCCESS);
      sessionStorage.removeItem('pending_payment_check');
      window.location.href = '/discount-shop?payment=success';
    } catch (err) {
      setError(err.message || 'Ошибка сохранения пароля');
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    await handleSendEmail({ preventDefault() {} });
  };

  if (loading) {
    return (
      <div className="shop-page">
        <div className="shop-loading"><span className="shop-loading__text">Завершаем оформление...</span></div>
      </div>
    );
  }

  return (
    <div className="shop-page">
      <div className="shop-payment" style={{ paddingTop: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.jpg" alt="Суши-Хаус 39" style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'cover' }} />
          <div style={{ marginTop: 12, fontSize: 20, fontWeight: 700, color: '#fff' }}>Подписка оформлена</div>
          <div style={{ marginTop: 4, fontSize: 14, color: '#71717A' }}>
            Подтвердите email и создайте пароль для входа.
          </div>
        </div>

        {profile && (
          <div className="shop-payment__card" style={{ marginBottom: 12 }}>
            <div style={{ color: '#71717A', fontSize: 14 }}>Телефон</div>
            <div style={{ color: '#fff', fontWeight: 700, marginTop: 4 }}>+{phone}</div>
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleSendEmail}>
            <div className="shop-form-field">
              <label className="shop-form-field__label">Email</label>
              <input
                className="shop-form-field__input"
                type="email"
                placeholder="example@mail.ru"
                value={email}
                onChange={event => setEmail(event.target.value)}
                disabled={submitting || !profile}
                autoFocus
              />
            </div>
            {error && <div className="shop-payment__error">{error}</div>}
            <button type="submit" className="shop-payment__btn" disabled={submitting || !profile}>
              {submitting ? 'Отправляем...' : 'Получить код'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp}>
            <div className="shop-form-field">
              <label className="shop-form-field__label">Код из письма</label>
              <input
                className="shop-form-field__input"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={code}
                onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))}
                disabled={submitting}
                autoFocus
                style={{ fontSize: 28, letterSpacing: 8, textAlign: 'center' }}
              />
            </div>
            {error && <div className="shop-payment__error">{error}</div>}
            <button type="submit" className="shop-payment__btn" disabled={submitting || code.length < 4}>
              {submitting ? 'Проверяем...' : 'Продолжить'}
            </button>
            <button
              type="button"
              className="partner-code-page__btn partner-code-page__btn--skip"
              onClick={handleResend}
              disabled={submitting || resendIn > 0}
            >
              {resendIn > 0 ? `Повторно через ${resendIn} сек.` : 'Отправить код повторно'}
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handleSetPassword}>
            <div className="shop-form-field">
              <label className="shop-form-field__label">Пароль</label>
              <input
                className="shop-form-field__input"
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                disabled={submitting}
                autoFocus
              />
            </div>
            <div className="shop-form-field">
              <label className="shop-form-field__label">Повторите пароль</label>
              <input
                className="shop-form-field__input"
                type="password"
                value={passwordConfirm}
                onChange={event => setPasswordConfirm(event.target.value)}
                disabled={submitting}
              />
            </div>
            {error && <div className="shop-payment__error">{error}</div>}
            <button type="submit" className="shop-payment__btn" disabled={submitting || password.length < 6 || !passwordConfirm}>
              {submitting ? 'Сохраняем...' : 'Сохранить и перейти в меню'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default CompleteRegistrationPage;
